import { mkdir, readdir, readFile } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";

import {
  ConflictError,
  ValidationError,
  appendEvent,
  hashContent,
  hashFile,
  safeWriteFile,
  withFileLock
} from "../runtime/index.mjs";
import { resolveDocType } from "../docs-structure/index.mjs";
import { taskIdForSubtask } from "../subtask/index.mjs";
import { applyCapabilityOutcome } from "../capability-outcome/index.mjs";
import { runSlotStaleHealthCheck } from "../slot-health/index.mjs";

const SOURCE_ACTOR = "ccb_claude";
const REPORT_VERSION = "reconcile-report-v0.1";
const ACTIONS_START = "<!-- ccb-reconcile-actions-json";
const ACTIONS_END = "-->";

function docsPath(projectRoot, ...parts) {
  return join(projectRoot, "docs", ".ccb", ...parts);
}

function projectContractPath(projectRoot) {
  return docsPath(projectRoot, "docs-structure-contract.yaml");
}

function normalizeRelative(path) {
  return path.replace(/\\/g, "/");
}

async function fileExists(path) {
  try {
    await readFile(path, "utf8");
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function resolveDocDirectory(projectRoot, docType) {
  const contractPath = projectContractPath(projectRoot);
  const options = (await fileExists(contractPath)) ? { contractPath } : {};
  const resolved = await resolveDocType(docType, options);
  return join(projectRoot, resolved.directory);
}

function isTemplateMarkdown(path) {
  return basename(path).startsWith("_模板_");
}

async function listFiles(root, predicate = () => true) {
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile() && predicate(path)) {
        out.push(path);
      }
    }
  }
  await walk(root);
  return out.sort();
}

function parseFrontmatter(content) {
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!matched) return { frontmatter: {}, body: content, ok: !content.startsWith("---") };
  const frontmatter = {};
  for (const line of matched[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) return { frontmatter, body: matched[2], ok: false };
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    frontmatter[key] = value.replace(/^['"]|['"]$/g, "");
  }
  return { frontmatter, body: matched[2], ok: true };
}

function parseDependencyList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed || trimmed === "[]") return [];
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
}

function actionId(seed) {
  return `rec-${hashContent(seed).slice(0, 12)}`;
}

function drift(input) {
  const id = input.id ?? actionId(`${input.category}:${input.subject_type}:${input.subject_id}:${JSON.stringify(input.detail ?? {})}`);
  return {
    id,
    category: input.category,
    severity: input.severity ?? "medium",
    subject_type: input.subject_type,
    subject_id: input.subject_id,
    title: input.title,
    detail: input.detail ?? {},
    suggested_action: input.suggested_action ?? { type: "manual_review", reason: "review required" },
    repair_level: input.repair_level ?? "approve"
  };
}

async function collectDevTaskDocuments(projectRoot) {
  const devTaskRoot = await resolveDocDirectory(projectRoot, "dev_task");
  const files = await listFiles(devTaskRoot, (path) => path.endsWith(".md") && !isTemplateMarkdown(path));
  const documents = [];
  for (const absPath of files) {
    const content = await readFile(absPath, "utf8");
    const parsed = parseFrontmatter(content);
    if (parsed.frontmatter.doc_type !== "dev_task") continue;
    documents.push({
      absPath,
      path: normalizeRelative(relative(projectRoot, absPath)),
      content,
      frontmatter: parsed.frontmatter,
      body: parsed.body
    });
  }
  return documents;
}

async function collectBreakdownDrafts(projectRoot) {
  const root = docsPath(projectRoot, "drafts", "breakdown");
  const files = await listFiles(root, (path) => path.endsWith(".json"));
  const drafts = [];
  for (const absPath of files) {
    try {
      drafts.push({
        absPath,
        path: normalizeRelative(relative(projectRoot, absPath)),
        draft: JSON.parse(await readFile(absPath, "utf8"))
      });
    } catch (error) {
      drafts.push({
        absPath,
        path: normalizeRelative(relative(projectRoot, absPath)),
        parseError: error instanceof Error ? error.message : String(error)
      });
    }
  }
  return drafts;
}

async function collectPluginJournalEvents(projectRoot) {
  const path = docsPath(projectRoot, "events", "journal.jsonl");
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }

  const events = [];
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      console.warn(
        `bad EventJournal line skipped during reconcile: ${path}:${index + 1}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  return events;
}

async function detectFileProjectionDrifts(projectRoot, snapshot, drifts) {
  for (const document of snapshot.documents ?? []) {
    if (!document?.path) continue;
    const absPath = join(projectRoot, document.path);
    if (!(await fileExists(absPath))) {
      drifts.push(drift({
        category: "orphan_projection",
        severity: "high",
        subject_type: "document",
        subject_id: document.path,
        title: `DB projection has no canonical file: ${document.path}`,
        detail: { path: document.path },
        suggested_action: { type: "refresh_projection", reason: "canonical file is missing" },
        repair_level: "auto"
      }));
      continue;
    }
    if (document.contentHash) {
      const fileHash = await hashFile(absPath);
      if (fileHash !== document.contentHash) {
        drifts.push(drift({
          category: "file_db_projection_mismatch",
          severity: "medium",
          subject_type: "document",
          subject_id: document.path,
          title: `File and DB projection hash differ: ${document.path}`,
          detail: { path: document.path, file_hash: fileHash, projection_hash: document.contentHash },
          suggested_action: { type: "refresh_projection", reason: "DB projection is stale" },
          repair_level: "auto"
        }));
      }
    }
    if (document.parseStatus && document.parseStatus !== "success") {
      drifts.push(drift({
        category: "parse_status_issue",
        severity: document.parseStatus === "parse_error" ? "high" : "medium",
        subject_type: "document",
        subject_id: document.path,
        title: `Indexer parse status is ${document.parseStatus}: ${document.path}`,
        detail: { path: document.path, parse_status: document.parseStatus, parse_error: document.parseError ?? null },
        suggested_action: { type: "manual_review", reason: "canonical file parse issue needs AI review" },
        repair_level: "approve"
      }));
    }
  }
}

async function detectTaskOrphans(projectRoot, snapshot, devTaskDocs, drifts) {
  const projectedTaskKeys = new Set();
  for (const task of snapshot.tasks ?? []) {
    const key = task.taskKey ?? task.task_id ?? task.id;
    if (key) projectedTaskKeys.add(key);
    const specPath = task.specPath ?? task.spec_path ?? task.path;
    if (specPath && !(await fileExists(join(projectRoot, specPath)))) {
      drifts.push(drift({
        category: "orphan_projection",
        severity: "high",
        subject_type: "subtask",
        subject_id: key ?? specPath,
        title: `Task projection has no canonical dev_task document: ${key ?? specPath}`,
        detail: { task_key: key ?? null, path: specPath },
        suggested_action: { type: "refresh_projection", reason: "stale Task projection should follow docs/03 dev_task documents" },
        repair_level: "auto"
      }));
    }
  }

  for (const document of devTaskDocs) {
    const taskId = document.frontmatter.task_id ?? basename(document.path, ".md");
    if (projectedTaskKeys.size > 0 && !projectedTaskKeys.has(taskId)) {
      drifts.push(drift({
        category: "orphan_file",
        severity: "medium",
        subject_type: "subtask",
        subject_id: taskId,
        title: `dev_task document has no DB projection: ${taskId}`,
        detail: { path: document.path, task_id: taskId },
        suggested_action: { type: "refresh_projection", reason: "canonical dev_task document must be projected" },
        repair_level: "auto"
      }));
    }
  }
}

function detectTaskProjectionStateDrifts(snapshot, devTaskDocs, drifts) {
  const devTasksByTaskId = new Map(
    devTaskDocs.map((document) => [document.frontmatter.task_id ?? basename(document.path, ".md"), document])
  );
  for (const task of snapshot.tasks ?? []) {
    const taskId = task.taskKey ?? task.task_id ?? task.id;
    if (!taskId || !devTasksByTaskId.has(taskId)) continue;
    const document = devTasksByTaskId.get(taskId);
    const source = document.frontmatter;
    const expected = {
      status: source.status,
      currentNode: source.current_node,
      nodeSubstate: source.node_substate,
      reviewStatus: source.review_status
    };
    const mismatches = [];
    for (const [field, expectedValue] of Object.entries(expected)) {
      if (task[field] !== undefined && task[field] !== expectedValue) {
        mismatches.push({ field, expected: expectedValue, actual: task[field] });
      }
    }
    if (mismatches.length > 0) {
      drifts.push(drift({
        category: "file_db_projection_mismatch",
        severity: "medium",
        subject_type: "subtask",
        subject_id: taskId,
        title: `Task DB projection differs from dev_task document: ${taskId}`,
        detail: {
          task_id: taskId,
          source_path: document.path,
          mismatches
        },
        suggested_action: { type: "refresh_projection", reason: "DB projection must follow docs/03 dev_task frontmatter" },
        repair_level: "auto"
      }));
    }
  }
}

function detectDependencyDrifts(devTaskDocs, drifts) {
  const knownTaskIds = new Set(devTaskDocs.map((document) => document.frontmatter.task_id).filter(Boolean));
  for (const document of devTaskDocs) {
    const taskId = document.frontmatter.task_id ?? basename(document.path, ".md");
    for (const dependency of parseDependencyList(document.frontmatter.dependencies)) {
      if (!knownTaskIds.has(dependency)) {
        drifts.push(drift({
          category: "subtask_dependency_missing",
          severity: "high",
          subject_type: "subtask",
          subject_id: taskId,
          title: `Subtask dependency points to missing task_id: ${dependency}`,
          detail: { path: document.path, task_id: taskId, dependency },
          suggested_action: { type: "manual_review", reason: "dependency graph needs canonical decision" },
          repair_level: "approve"
        }));
      }
    }
  }
}

async function detectConsumedDraftDrifts(drafts, devTaskDocs, drifts) {
  const knownTaskIds = new Set(devTaskDocs.map((document) => document.frontmatter.task_id).filter(Boolean));
  for (const item of drafts) {
    if (item.parseError) {
      drifts.push(drift({
        category: "parse_status_issue",
        severity: "high",
        subject_type: "breakdown_draft",
        subject_id: item.path,
        title: `Breakdown draft JSON parse failed: ${item.path}`,
        detail: { path: item.path, error: item.parseError },
        suggested_action: { type: "manual_review", reason: "draft JSON is not readable" },
        repair_level: "approve"
      }));
      continue;
    }
    const draft = item.draft;
    if (draft?.status !== "consumed" || !Array.isArray(draft.subtasks)) continue;
    for (const subtask of draft.subtasks.filter((entry) => entry?.include !== false)) {
      const taskId = taskIdForSubtask(draft.requirement_id, subtask.section_id);
      if (!knownTaskIds.has(taskId)) {
        drifts.push(drift({
          category: "consumed_draft_missing_subtask",
          severity: "high",
          subject_type: "requirement",
          subject_id: draft.requirement_id,
          title: `Consumed draft is missing materialized subtask: ${subtask.section_id}`,
          detail: { draft_path: item.path, section_id: subtask.section_id, expected_task_id: taskId, expected_doc_type: "dev_task" },
          suggested_action: { type: "manual_review", reason: "consumed draft may need re-materialization or rollback" },
          repair_level: "approve"
        }));
      }
    }
  }
}

function detectKnownConsoleDrifts(snapshot, drifts) {
  for (const item of snapshot.driftTasks ?? []) {
    const repair = item.suggested_repair ?? { type: "manual_review", reason: "Console drift" };
    drifts.push(drift({
      category: "known_console_drift",
      severity: repair.type === "manual_review" ? "high" : "medium",
      subject_type: item.subjectType ?? "subtask",
      subject_id: item.subjectId ?? item.taskId ?? item.taskKey ?? "unknown",
      title: item.title ?? item.taskKey ?? item.category,
      detail: { category: item.category, path: item.spec_path ?? null },
      suggested_action: { ...repair, reason: repair.reason ?? "Console drift suggested repair" },
      repair_level: repair.type === "manual_review" ? "approve" : "approve"
    }));
  }
}

function detectStatusRepairCandidates(snapshot, drifts) {
  for (const item of snapshot.statusRepairCandidates ?? []) {
    drifts.push(drift({
      category: "status_repair_migration",
      severity: "medium",
      subject_type: item.subjectType ?? "subtask",
      subject_id: item.subjectId ?? item.taskId ?? "unknown",
      title: item.title ?? item.taskKey ?? "status repair candidate",
      detail: { path: item.spec_path ?? item.path ?? null },
      suggested_action: {
        type: item.type,
        payload: item.payload,
        reason: item.reason ?? "migrated from status-repair"
      },
      repair_level: item.type === "rollup_requirement" ? "auto" : "approve"
    }));
  }
}

function journalRunId(event) {
  return event?.payload?.run_id ?? null;
}

function isMatchingTerminal(intent, terminal) {
  const runId = journalRunId(intent);
  if (runId && journalRunId(terminal) === runId) return true;
  if (terminal?.payload?.intent_event_id && terminal.payload.intent_event_id === intent.idempotency_key) return true;
  return false;
}

function journalDriftDetail(event, terminalEvent) {
  return {
    run_id: journalRunId(event),
    target_path: event?.payload?.target_path ?? null,
    resource_type: event?.payload?.resource_type ?? null,
    terminal_event: terminalEvent,
    idempotency_key: event?.idempotency_key ?? null
  };
}

function detectEventJournalWriteDrifts(events, drifts) {
  const terminals = events.filter((event) =>
    ["state_write_done", "state_write_failed", "state_write_conflict"].includes(event?.type)
  );

  for (const event of events.filter((item) => item?.type === "state_write_intent")) {
    if (terminals.some((terminal) => isMatchingTerminal(event, terminal))) continue;
    drifts.push(drift({
      category: "pending_state_write_intent",
      severity: "high",
      subject_type: event.subject_type ?? "project",
      subject_id: event.subject_id ?? journalRunId(event) ?? "unknown",
      title: `State write intent has no terminal event: ${journalRunId(event) ?? event.idempotency_key ?? "unknown"}`,
      detail: journalDriftDetail(event, "missing"),
      suggested_action: { type: "manual_review", reason: "intent has no terminal event" },
      repair_level: "approve"
    }));
  }

  for (const event of events.filter((item) => item?.type === "state_write_conflict")) {
    drifts.push(drift({
      category: "state_write_conflict",
      severity: "high",
      subject_type: event.subject_type ?? "project",
      subject_id: event.subject_id ?? journalRunId(event) ?? "unknown",
      title: `CAS conflict requires reconciliation: ${journalRunId(event) ?? event.idempotency_key ?? "unknown"}`,
      detail: journalDriftDetail(event, "conflict"),
      suggested_action: { type: "manual_review", reason: "CAS conflict requires AI/user reconciliation" },
      repair_level: "approve"
    }));
  }

  for (const event of events.filter((item) => item?.type === "state_write_failed")) {
    drifts.push(drift({
      category: "state_write_failed",
      severity: "high",
      subject_type: event.subject_type ?? "project",
      subject_id: event.subject_id ?? journalRunId(event) ?? "unknown",
      title: `State write failed after intent: ${journalRunId(event) ?? event.idempotency_key ?? "unknown"}`,
      detail: journalDriftDetail(event, "failed"),
      suggested_action: { type: "manual_review", reason: "state write failure requires AI/user reconciliation" },
      repair_level: "approve"
    }));
  }
}

export async function detectDrifts({ projectRoot, projectionSnapshot = {} }) {
  const drifts = [];
  const [devTaskDocs, drafts, journalEvents] = await Promise.all([
    collectDevTaskDocuments(projectRoot),
    collectBreakdownDrafts(projectRoot),
    collectPluginJournalEvents(projectRoot)
  ]);

  await detectFileProjectionDrifts(projectRoot, projectionSnapshot, drifts);
  await detectTaskOrphans(projectRoot, projectionSnapshot, devTaskDocs, drifts);
  detectTaskProjectionStateDrifts(projectionSnapshot, devTaskDocs, drifts);
  detectDependencyDrifts(devTaskDocs, drifts);
  await detectConsumedDraftDrifts(drafts, devTaskDocs, drifts);
  detectKnownConsoleDrifts(projectionSnapshot, drifts);
  detectStatusRepairCandidates(projectionSnapshot, drifts);
  detectEventJournalWriteDrifts(journalEvents, drifts);

  return dedupeDrifts(drifts);
}

function dedupeDrifts(drifts) {
  const seen = new Set();
  const out = [];
  for (const item of drifts) {
    const key = `${item.category}:${item.subject_type}:${item.subject_id}:${JSON.stringify(item.detail)}:${item.suggested_action.type}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function reportTimestamp(now = new Date().toISOString()) {
  return now.replace(/[-:]/g, "").replace(".", "").replace(/Z$/, "Z");
}

function reportRelativePath(now) {
  const month = now.slice(0, 7);
  return normalizeRelative(join("docs", ".ccb", "drafts", "reconcile", month, `reconcile-${reportTimestamp(now)}.md`));
}

function scopeText(scope = { type: "project" }) {
  return scope.subject_id ? `${scope.type}:${scope.subject_id}` : scope.type ?? "project";
}

function renderReport({ scope, now, drifts, applied = [] }) {
  const byCategory = new Map();
  for (const item of drifts) {
    const bucket = byCategory.get(item.category) ?? [];
    bucket.push(item);
    byCategory.set(item.category, bucket);
  }
  const lines = [
    "---",
    `schema_version: ${REPORT_VERSION}`,
    `created_at: ${now}`,
    `scope: ${scopeText(scope)}`,
    "---",
    "",
    "# Reconcile Report",
    "",
    `- created_at: ${now}`,
    `- scope: ${scopeText(scope)}`,
    `- drift_count: ${drifts.length}`,
    "",
    "## Drift Summary",
    ""
  ];
  if (drifts.length === 0) {
    lines.push("- no drift detected", "");
  } else {
    for (const [category, items] of byCategory) {
      lines.push(`### ${category}`, "");
      for (const item of items) {
        const detailLines = ["pending_state_write_intent", "state_write_conflict", "state_write_failed"].includes(item.category)
          ? [
              `  - run_id: ${item.detail.run_id ?? ""}`,
              `  - target_path: ${item.detail.target_path ?? ""}`,
              `  - terminal_event: ${item.detail.terminal_event ?? ""}`
            ]
          : [];
        lines.push(
          `- [ ] \`${item.id}\` ${item.severity} ${item.subject_type}:${item.subject_id} - ${item.title}`,
          `  - repair_level: ${item.repair_level}`,
          `  - suggested_action: ${item.suggested_action.type}`,
          `  - reason: ${item.suggested_action.reason ?? ""}`,
          ...detailLines,
          ""
        );
      }
    }
  }
  lines.push(
    "## Apply Queue",
    "",
    "勾选 approve 级 action 后，再用 `/ccb:su-reconcile --payload {\"mode\":\"apply\",\"approved_actions\":[...]}` 提交。",
    "",
    "## Applied Actions",
    "",
    ...(applied.length === 0 ? ["- none", ""] : applied.map((item) => `- ${item.id}: ${item.status}`)),
    ACTIONS_START,
    JSON.stringify(drifts, null, 2),
    ACTIONS_END,
    ""
  );
  return lines.join("\n");
}

export async function generateReconcileReport({ projectRoot, scope = { type: "project" }, now = new Date().toISOString(), drifts }) {
  const reportPath = reportRelativePath(now);
  const content = renderReport({ scope, now, drifts });
  const absPath = join(projectRoot, reportPath);
  await mkdir(dirname(absPath), { recursive: true });
  await safeWriteFile(absPath, content, {
    expectedHash: null,
    audit: {
      projectRoot,
      subjectType: "project",
      subjectId: scopeText(scope),
      sourceActor: SOURCE_ACTOR,
      resourceType: "reconcile_report",
      operation: "generateReconcileReport",
      runId: `reconcile-report:${now}:${scopeText(scope)}`,
      plannedDiff: { scope: scopeText(scope), drift_count: drifts.length },
      targetPath: reportPath
    }
  });
  return { reportPath, drifts };
}

export function parseReconcileReportActions(content) {
  const start = content.indexOf(ACTIONS_START);
  if (start === -1) return [];
  const jsonStart = content.indexOf("\n", start);
  const end = content.indexOf(ACTIONS_END, jsonStart);
  if (jsonStart === -1 || end === -1) return [];
  return JSON.parse(content.slice(jsonStart + 1, end).trim());
}

async function emitReconcileEvent(projectRoot, event) {
  return await appendEvent(
    {
      subject_type: event.subject_type ?? "project",
      subject_id: event.subject_id ?? "project",
      emitted_at: event.emitted_at ?? new Date().toISOString(),
      source_actor: SOURCE_ACTOR,
      payload: event.payload ?? {},
      ...event
    },
    { projectRoot }
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runReconcileDetect({
  projectRoot,
  scope = { type: "project" },
  projectionSnapshot = {},
  now = new Date().toISOString(),
  lockOptions = {},
  includeSlotHealth = false
}) {
  const lockPath = docsPath(projectRoot, "locks", "reconcile.lock");
  return await withFileLock(
    lockPath,
    async () => {
      if (lockOptions.holdMs) await sleep(lockOptions.holdMs);
      await emitReconcileEvent(projectRoot, {
        type: "reconcile_started",
        payload: { scope },
        idempotency_key: `reconcile-started:${now}:${scopeText(scope)}`
      });
      const drifts = await detectDrifts({ projectRoot, projectionSnapshot });
      for (const item of drifts) {
        await emitReconcileEvent(projectRoot, {
          type: "drift_detected",
          subject_type: item.subject_type,
          subject_id: item.subject_id,
          payload: item,
          idempotency_key: `drift-detected:${now}:${item.id}`
        });
      }
      const report = await generateReconcileReport({ projectRoot, scope, now, drifts });
      const slotHealth = includeSlotHealth
        ? await runSlotStaleHealthCheck({ projectRoot, now })
        : null;
      await emitReconcileEvent(projectRoot, {
        type: "reconcile_completed",
        payload: {
          scope,
          report_path: report.reportPath,
          drift_count: drifts.length,
          ...(slotHealth ? { slot_health: slotHealth } : {})
        },
        idempotency_key: `reconcile-completed:${now}:${scopeText(scope)}`
      });
      return slotHealth ? { ...report, slotHealth } : report;
    },
    { ...lockOptions, lockPath }
  );
}

function replaceFrontmatterField(content, field, value) {
  const line = `${field}: ${value}`;
  const pattern = new RegExp(`^${field}:\\s*.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return content.replace(/^---\r?\n/, `---\n${line}\n`);
}

async function readSpecContext(projectRoot, path, fallbackTaskId) {
  if (!path) return { taskId: fallbackTaskId, title: fallbackTaskId, frontmatter: {} };
  const content = await readFile(join(projectRoot, path), "utf8");
  const parsed = parseFrontmatter(content);
  const taskId = parsed.frontmatter.task_id ?? fallbackTaskId ?? basename(path, ".md");
  return {
    taskId,
    title: parsed.frontmatter.title ?? taskId,
    frontmatter: parsed.frontmatter
  };
}

async function applySubtaskStateAction(projectRoot, action) {
  const path = action.detail?.path;
  const context = await readSpecContext(projectRoot, path, action.subject_id);
  if (!context.taskId) {
    throw new ValidationError(`action ${action.id} needs detail.path for canonical subtask repair`, {
      issues: [`${action.id}: missing task id`]
    });
  }
  const patch = {};
  const type = action.suggested_action?.type;
  if (type === "set_status") {
    const status = action.suggested_action?.payload?.status;
    const normalizedStatus =
      status === "archived" || status === "completed" ? "done" :
        status === "cancelled" ? "cancelled" :
          status === "done" ? "done" :
            status === "reviewing" ? "reviewing" : null;
    if (!normalizedStatus) {
      throw new ValidationError(`action ${action.id} has invalid status`, {
        issues: [`${action.id}: unsupported dev_task status ${status}`]
      });
    }
    patch.status = normalizedStatus;
  } else if (type === "quick_archive") {
    patch.status = "done";
    patch.current_node = "archive";
    patch.node_substate = "archived";
    patch.review_status = "passed";
  } else if (type === "unset_archive") {
    patch.status = "reviewing";
    patch.current_node = "dispatch";
    patch.node_substate = "awaiting_codex_pickup";
  }
  return { taskId: context.taskId, title: context.title, patch };
}

function reportCreatedAt(content) {
  return parseFrontmatter(content).frontmatter.created_at ?? new Date().toISOString();
}

function capabilityForAction(action) {
  const type = action.suggested_action?.type;
  if (type === "quick_archive") return { capabilityId: "reconcile.apply", outcomeType: "reconcile_quick_archive" };
  if (["set_status", "unset_archive"].includes(type)) {
    return { capabilityId: "reconcile.apply", outcomeType: "reconcile_drift_repaired" };
  }
  return null;
}

function evidenceForAction({ action, reportPath, reportHash, createdAt }) {
  if (action.suggested_action?.type === "quick_archive") {
    return [
      {
        kind: "C",
        ref: `reconcile-report:${reportPath}`,
        check_id: "hash_matches",
        params: { path: reportPath, expected_hash: reportHash }
      }
    ];
  }
  return [
    {
      kind: "A",
      ref: `drift-detected:${createdAt}:${action.id}`,
      check_id: "journal_event_exists",
      params: {
        idempotency_key: `drift-detected:${createdAt}:${action.id}`,
        event_type: "drift_detected"
      }
    }
  ];
}

async function applyAction(projectRoot, action, context = {}) {
  const type = action.suggested_action?.type;
  let outcomeResult = null;
  if (["set_status", "quick_archive", "unset_archive"].includes(type)) {
    const stateAction = await applySubtaskStateAction(projectRoot, action);
    const capability = capabilityForAction(action);
    outcomeResult = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: capability.capabilityId,
      outcomeType: capability.outcomeType,
      subjectRef: {
        subject_type: "subtask",
        subject_id: stateAction.taskId
      },
      stateInput: stateAction.patch,
      evidence: evidenceForAction({ action, ...context }),
      sourceActor: "reconcile",
      now: context.createdAt
    });
    if (!outcomeResult.ok) {
      throw new ConflictError(`capability outcome rejected for action ${action.id}: ${outcomeResult.code}`, {
        issues: outcomeResult.issues
      });
    }
  }
  await emitReconcileEvent(projectRoot, {
    type: "state_reconciled",
    subject_type: action.subject_type,
    subject_id: action.subject_id,
    payload: {
      action_id: action.id,
      category: action.category,
      repair_level: action.repair_level,
      suggested_action: action.suggested_action,
      outcome_id: outcomeResult?.outcome_id ?? null,
      policy_id: outcomeResult?.policy_id ?? null
    },
    idempotency_key: `state-reconciled:${action.id}:${type}`
  });
  return { id: action.id, status: "applied", repair_level: action.repair_level };
}

export async function applyApprovedActions({ projectRoot, reportPath, approvedActionIds = [], lockOptions = {} }) {
  const lockPath = docsPath(projectRoot, "locks", "reconcile.lock");
  return await withFileLock(
    lockPath,
    async () => {
      const absReportPath = join(projectRoot, reportPath);
      const content = await readFile(absReportPath, "utf8");
      const createdAt = reportCreatedAt(content);
      const reportHash = hashContent(content);
      const actions = parseReconcileReportActions(content);
      const approved = new Set(approvedActionIds);
      const forbidden = actions.filter((action) => approved.has(action.id) && action.repair_level === "forbid");
      if (forbidden.length > 0) {
        throw new ValidationError(`forbidden reconcile actions cannot be applied: ${forbidden.map((item) => item.id).join(", ")}`, {
          issues: forbidden.map((item) => `${item.id}: forbidden`)
        });
      }
      const missingApproval = actions.filter((action) => action.repair_level === "approve" && !approved.has(action.id));
      if (missingApproval.length > 0) {
        throw new ConflictError(`reconcile actions require approval: ${missingApproval.map((item) => item.id).join(", ")}`, {
          issues: missingApproval.map((item) => `${item.id}: requires approval`)
        });
      }
      const toApply = actions.filter((action) => action.repair_level === "auto" || approved.has(action.id));
      const applied = [];
      for (const action of toApply) {
        if (action.repair_level === "forbid") continue;
        applied.push(await applyAction(projectRoot, action, { reportPath, reportHash, createdAt }));
      }
      const nextContent = content.replace(
        /## Applied Actions[\s\S]*?<!-- ccb-reconcile-actions-json/,
        [
          "## Applied Actions",
          "",
          ...applied.map((item) => `- ${item.id}: ${item.status}`),
          "",
          ACTIONS_START
        ].join("\n")
      );
      await safeWriteFile(absReportPath, nextContent, {
        expectedHash: reportHash,
        audit: {
          projectRoot,
          subjectType: "project",
          subjectId: "project",
          sourceActor: SOURCE_ACTOR,
          resourceType: "reconcile_report",
          operation: "applyApprovedActionsReportUpdate",
          runId: `reconcile-report-apply:${hashContent(reportPath).slice(0, 12)}:${hashContent(content).slice(0, 12)}`,
          plannedDiff: { applied_action_ids: applied.map((item) => item.id) },
          targetPath: reportPath
        }
      });
      return { reportPath, applied };
    },
    { ...lockOptions, lockPath }
  );
}
