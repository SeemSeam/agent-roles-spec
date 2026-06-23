import { readFile, readdir } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve } from "node:path";

import { applyCapabilityOutcome } from "../capability-outcome/index.mjs";
import { readBreakdownDraft, deleteBreakdownDraft } from "../breakdown-draft/index.mjs";
import { resolveDocType } from "../docs-structure/index.mjs";
import { findRequirementMarkdown } from "../requirement-analysis/index.mjs";
import { appendEvent, hashContent } from "../runtime/index.mjs";
import { readTaskState } from "../state/index.mjs";
import {
  cleanupRequirementWorktree,
  discardRequirementWorktree,
  requirementWorktreeStatePath
} from "../worktree/index.mjs";

const MUST_ASK_REF = "must_ask_9";
const TERMINAL_SUBTASK_STATUSES = new Set(["done", "cancelled"]);
const SKIPPED_WORKTREE_STATUSES = new Set(["missing", "archived", "discarded"]);

function normalizeProjectRoot(projectRoot) {
  if (typeof projectRoot !== "string" || projectRoot.trim().length === 0) {
    throw new Error("projectRoot must be a non-empty string");
  }
  return resolve(projectRoot);
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function projectRelativePath(projectRoot, path) {
  const relativePath = isAbsolute(path) ? relative(projectRoot, path) : path;
  const normalized = normalizePath(relativePath);
  if (!normalized || normalized === ".." || normalized.startsWith("../") || isAbsolute(normalized)) {
    throw new Error(`path is outside project root: ${path}`);
  }
  return normalized;
}

function safeKey(value) {
  return String(value ?? "none").replace(/[^a-zA-Z0-9._:-]/g, "_").slice(0, 180) || "none";
}

function dispatchKey(dispatchRef) {
  if (!dispatchRef) return "manual";
  if (typeof dispatchRef === "string") return dispatchRef;
  for (const key of ["jobId", "job_id", "dispatchId", "dispatch_id", "id"]) {
    if (typeof dispatchRef?.[key] === "string" && dispatchRef[key].trim()) return dispatchRef[key].trim();
  }
  return hashContent(JSON.stringify(dispatchRef));
}

function normalizeReason(reason) {
  return typeof reason === "string" && reason.trim() ? reason.trim() : null;
}

function requirementCancelOutcomeId(requirementId, hash, dispatchRef) {
  return `requirement-cancel:${safeKey(requirementId)}:${safeKey(hash)}:${safeKey(dispatchKey(dispatchRef))}`;
}

function subtaskCancelOutcomeId(taskId, hash, dispatchRef) {
  return `subtask-cancel:${safeKey(taskId)}:${safeKey(hash)}:${safeKey(dispatchKey(dispatchRef))}`;
}

function parseFrontmatter(content) {
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!matched) return {};
  const frontmatter = {};
  for (const line of matched[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf(":");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    frontmatter[key] = /^-?\d+$/.test(value) ? Number.parseInt(value, 10) : value;
  }
  return frontmatter;
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
  const contractPath = join(projectRoot, "docs", ".ccb", "docs-structure-contract.yaml");
  const options = (await fileExists(contractPath)) ? { contractPath } : {};
  const resolved = await resolveDocType(docType, options);
  return join(projectRoot, resolved.directory);
}

async function listMarkdownFiles(root) {
  const entries = await readdir(root, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") return [];
    throw error;
  });
  const files = [];
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".md") && !basename(path).startsWith("_模板_")) {
      files.push(path);
    }
  }
  return files.sort();
}

async function readRequirement(projectRoot, requirementId) {
  const path = await findRequirementMarkdown(projectRoot, requirementId);
  const content = await readFile(path, "utf8");
  const canonicalPath = projectRelativePath(projectRoot, path);
  return {
    path,
    canonicalPath,
    content,
    hash: hashContent(content),
    frontmatter: parseFrontmatter(content)
  };
}

export async function listDevTasksByRequirement({ projectRoot, requirementId }) {
  const root = normalizeProjectRoot(projectRoot);
  const devTaskRoot = await resolveDocDirectory(root, "dev_task");
  const tasks = [];
  for (const path of await listMarkdownFiles(devTaskRoot)) {
    const content = await readFile(path, "utf8");
    const frontmatter = parseFrontmatter(content);
    if (frontmatter.doc_type !== "dev_task" || frontmatter.requirement_id !== requirementId) continue;
    tasks.push({
      taskId: frontmatter.task_id,
      status: frontmatter.status,
      path,
      canonicalPath: projectRelativePath(root, path),
      content,
      hash: hashContent(content),
      frontmatter
    });
  }
  return tasks.filter((task) => typeof task.taskId === "string" && task.taskId.trim()).sort((left, right) =>
    left.taskId.localeCompare(right.taskId)
  );
}

function requirementSubjectRef(requirementId, requirement) {
  return {
    subject_type: "requirement",
    subject_id: requirementId,
    canonical_path: requirement.canonicalPath,
    base_hash: requirement.hash
  };
}

function fileEvidence(canonicalPath) {
  return {
    kind: "A",
    ref: `file:${canonicalPath}`,
    check_id: "file_exists",
    params: { path: canonicalPath }
  };
}

function authorizationEvidence(subjectRef, authorizationKey) {
  return {
    kind: "B",
    ref: authorizationKey,
    check_id: "journal_event_exists",
    params: {
      idempotency_key: authorizationKey,
      event_type: "user_cancel_authorized",
      must_ask_ref: MUST_ASK_REF,
      approved_by: "user",
      subject_ref: subjectRef
    }
  };
}

async function appendUserCancelAuthorized({
  projectRoot,
  subjectType,
  subjectId,
  requirementId,
  taskId,
  reason,
  dispatchRef,
  subjectRef,
  authorizationKey,
  sourceActor,
  now
}) {
  return await appendEvent(
    {
      type: "user_cancel_authorized",
      subject_type: subjectType,
      subject_id: subjectId,
      payload: {
        requirement_id: requirementId ?? null,
        task_id: taskId ?? null,
        reason: normalizeReason(reason),
        dispatch_ref: dispatchRef ?? null,
        must_ask_ref: MUST_ASK_REF,
        approved_by: "user",
        subject_ref: subjectRef,
        idempotency_key: authorizationKey
      },
      idempotency_key: authorizationKey,
      emitted_at: now ?? new Date().toISOString(),
      source_actor: sourceActor
    },
    { projectRoot }
  );
}

async function appendCapabilityRejected({
  projectRoot,
  subjectRef,
  capabilityId,
  outcomeType,
  outcomeId,
  code,
  issues,
  sourceActor,
  now
}) {
  await appendEvent(
    {
      type: "capability_outcome_rejected",
      subject_type: subjectRef.subject_type,
      subject_id: subjectRef.subject_id,
      payload: {
        outcome_id: outcomeId,
        capability_id: capabilityId,
        outcome_type: outcomeType,
        code,
        issues
      },
      idempotency_key: `capability-outcome:${outcomeId}:rejected`,
      emitted_at: now ?? new Date().toISOString(),
      source_actor: sourceActor
    },
    { projectRoot, failPolicy: "warning-only" }
  );
}

function rejectedResult({ subjectRef, capabilityId, outcomeType, code, issues, reconcileRequired = false }) {
  return {
    ok: false,
    code,
    subject_ref: subjectRef,
    capability_id: capabilityId,
    outcome_type: outcomeType,
    reconcile_required: reconcileRequired,
    issues
  };
}

async function failCancel({
  projectRoot,
  subjectRef,
  capabilityId,
  outcomeType,
  outcomeId,
  code,
  issues,
  sourceActor,
  now,
  reconcileRequired = false
}) {
  await appendCapabilityRejected({
    projectRoot,
    subjectRef,
    capabilityId,
    outcomeType,
    outcomeId,
    code,
    issues,
    sourceActor,
    now
  });
  return rejectedResult({ subjectRef, capabilityId, outcomeType, code, issues, reconcileRequired });
}

async function applyRequirementCancel({
  projectRoot,
  requirementId,
  requirement,
  reason,
  sourceActor,
  dispatchRef,
  now,
  authorized = true,
  testHooks
}) {
  const subjectRef = requirementSubjectRef(requirementId, requirement);
  const runKey = safeKey(dispatchKey(dispatchRef));
  const outcomeId = requirementCancelOutcomeId(requirementId, requirement.hash, dispatchRef);
  const evidence = [fileEvidence(requirement.canonicalPath)];
  const mustAskRefs = [];

  if (authorized !== false) {
    const authorizationKey = `user-cancel-authorized:requirement:${safeKey(requirementId)}:${safeKey(requirement.hash)}:${runKey}`;
    await appendUserCancelAuthorized({
      projectRoot,
      subjectType: "requirement",
      subjectId: requirementId,
      requirementId,
      reason,
      dispatchRef,
      subjectRef,
      authorizationKey,
      sourceActor,
      now
    });
    evidence.push(authorizationEvidence(subjectRef, authorizationKey));
    mustAskRefs.push(MUST_ASK_REF);
  }

  await testHooks?.beforeRequirementApply?.({ requirementId, requirement, outcomeId });
  const result = await applyCapabilityOutcome({
    projectRoot,
    capabilityId: "requirement.cancel",
    outcomeType: "cancelled",
    outcomeId,
    subjectRef,
    expectedHash: requirement.hash,
    evidence,
    mustAskRefs,
    sourceActor,
    now
  });
  if (!result.ok) {
    await appendCapabilityRejected({
      projectRoot,
      subjectRef,
      capabilityId: "requirement.cancel",
      outcomeType: "cancelled",
      outcomeId,
      code: result.code,
      issues: result.issues ?? [],
      sourceActor,
      now
    });
  }
  return { result, outcomeId, subjectRef };
}

async function readSubtaskForCancel(projectRoot, taskId) {
  const state = await readTaskState({ projectRoot, taskId });
  if (!state) return null;
  return {
    taskId,
    status: state.frontmatter.status,
    path: state.path,
    canonicalPath: projectRelativePath(projectRoot, state.path),
    content: state.content,
    hash: state.hash,
    frontmatter: state.frontmatter
  };
}

async function applySubtaskCancelAttempt({
  projectRoot,
  task,
  reason,
  sourceActor,
  dispatchRef,
  parentRequirementId,
  now,
  authorized,
  testHooks,
  attempt
}) {
  const subjectRef = {
    subject_type: "subtask",
    subject_id: task.taskId,
    canonical_path: task.canonicalPath,
    base_hash: task.hash
  };
  const runKey = safeKey(dispatchKey(dispatchRef));
  const outcomeId = subtaskCancelOutcomeId(task.taskId, task.hash, dispatchRef);
  const evidence = [fileEvidence(task.canonicalPath)];
  const mustAskRefs = [];

  if (authorized !== false) {
    const authorizationKey = `user-cancel-authorized:subtask:${safeKey(task.taskId)}:${safeKey(task.hash)}:${runKey}`;
    await appendUserCancelAuthorized({
      projectRoot,
      subjectType: "subtask",
      subjectId: task.taskId,
      requirementId: parentRequirementId ?? task.frontmatter.requirement_id ?? null,
      taskId: task.taskId,
      reason,
      dispatchRef,
      subjectRef,
      authorizationKey,
      sourceActor,
      now
    });
    evidence.push(authorizationEvidence(subjectRef, authorizationKey));
    mustAskRefs.push(MUST_ASK_REF);
  }

  await testHooks?.beforeSubtaskApply?.({ taskId: task.taskId, task, outcomeId, attempt });
  const result = await applyCapabilityOutcome({
    projectRoot,
    capabilityId: "subtask.cancel",
    outcomeType: "cancelled",
    outcomeId,
    subjectRef,
    expectedHash: task.hash,
    evidence,
    mustAskRefs,
    sourceActor,
    now
  });
  return { result, outcomeId, subjectRef };
}

async function finalizeSubtaskFailure({ projectRoot, attempt, sourceActor, now }) {
  await appendCapabilityRejected({
    projectRoot,
    subjectRef: attempt.subjectRef,
    capabilityId: "subtask.cancel",
    outcomeType: "cancelled",
    outcomeId: attempt.outcomeId,
    code: attempt.result.code,
    issues: attempt.result.issues ?? [],
    sourceActor,
    now
  });
}

export async function cancelSubtask(input = {}) {
  const projectRoot = normalizeProjectRoot(input.projectRoot);
  const taskId = input.taskId ?? input.subtaskId;
  const sourceActor = input.sourceActor ?? "ccb_claude";
  const steps = [];
  const issues = [];

  let task;
  try {
    task = await readSubtaskForCancel(projectRoot, taskId);
  } catch (error) {
    const subjectRef = { subject_type: "subtask", subject_id: taskId ?? "unknown" };
    const result = await failCancel({
      projectRoot,
      subjectRef,
      capabilityId: "subtask.cancel",
      outcomeType: "cancelled",
      outcomeId: `subtask-cancel:${safeKey(taskId)}:resolve-failed:${safeKey(dispatchKey(input.dispatchRef))}`,
      code: "GUARD_FAILED",
      issues: [error instanceof Error ? error.message : String(error)],
      sourceActor,
      now: input.now
    });
    return { ...result, noop: false, resumed: false, steps, issues: result.issues };
  }

  if (!task) {
    const subjectRef = { subject_type: "subtask", subject_id: taskId ?? "unknown" };
    const result = await failCancel({
      projectRoot,
      subjectRef,
      capabilityId: "subtask.cancel",
      outcomeType: "cancelled",
      outcomeId: `subtask-cancel:${safeKey(taskId)}:missing:${safeKey(dispatchKey(input.dispatchRef))}`,
      code: "GUARD_FAILED",
      issues: [`dev_task not found: ${taskId}`],
      sourceActor,
      now: input.now
    });
    return { ...result, noop: false, resumed: false, steps, issues: result.issues };
  }

  steps.push({ step: "resolve", task_id: task.taskId, status: task.status, path: task.canonicalPath });
  if (task.status === "cancelled") {
    steps.push({ step: "tombstone", status: "skipped", reason: "already_cancelled" });
    return { ok: true, noop: true, resumed: true, steps, issues };
  }
  if (task.status === "done") {
    const subjectRef = {
      subject_type: "subtask",
      subject_id: task.taskId,
      canonical_path: task.canonicalPath,
      base_hash: task.hash
    };
    const result = await failCancel({
      projectRoot,
      subjectRef,
      capabilityId: "subtask.cancel",
      outcomeType: "cancelled",
      outcomeId: `subtask-cancel:${safeKey(task.taskId)}:${safeKey(task.hash)}:terminal:${safeKey(dispatchKey(input.dispatchRef))}`,
      code: "GUARD_FAILED",
      issues: ["subtask.cancel cannot override done dev_task"],
      sourceActor,
      now: input.now
    });
    return { ...result, noop: false, resumed: false, steps, issues: result.issues };
  }

  let attempt;
  try {
    attempt = await applySubtaskCancelAttempt({
      projectRoot,
      task,
      reason: input.reason,
      sourceActor,
      dispatchRef: input.dispatchRef,
      parentRequirementId: input.requirementId,
      now: input.now,
      authorized: input.authorized,
      testHooks: input.testHooks,
      attempt: 1
    });
  } catch (error) {
    const subjectRef = {
      subject_type: "subtask",
      subject_id: task.taskId,
      canonical_path: task.canonicalPath,
      base_hash: task.hash
    };
    const result = await failCancel({
      projectRoot,
      subjectRef,
      capabilityId: "subtask.cancel",
      outcomeType: "cancelled",
      outcomeId: subtaskCancelOutcomeId(task.taskId, task.hash, input.dispatchRef),
      code: "EVENT_APPEND_FAILED",
      issues: [error instanceof Error ? error.message : String(error)],
      sourceActor,
      now: input.now,
      reconcileRequired: true
    });
    return { ...result, noop: false, resumed: false, steps, issues: result.issues };
  }
  if (!attempt.result.ok && attempt.result.code === "CAS_CONFLICT") {
    const reread = await readSubtaskForCancel(projectRoot, task.taskId);
    if (!reread) {
      await finalizeSubtaskFailure({ projectRoot, attempt, sourceActor, now: input.now });
      return {
        ...attempt.result,
        noop: false,
        resumed: false,
        steps: [...steps, { step: "tombstone", status: "failed", code: "CAS_CONFLICT" }],
        issues: attempt.result.issues ?? []
      };
    }
    if (TERMINAL_SUBTASK_STATUSES.has(reread.status)) {
      steps.push({ step: "tombstone", status: "skipped", reason: `became_${reread.status}` });
      return { ok: true, noop: true, resumed: false, steps, issues };
    }
    try {
      attempt = await applySubtaskCancelAttempt({
        projectRoot,
        task: reread,
        reason: input.reason,
        sourceActor,
        dispatchRef: input.dispatchRef,
        parentRequirementId: input.requirementId,
        now: input.now,
        authorized: input.authorized,
        testHooks: input.testHooks,
        attempt: 2
      });
    } catch (error) {
      const subjectRef = {
        subject_type: "subtask",
        subject_id: reread.taskId,
        canonical_path: reread.canonicalPath,
        base_hash: reread.hash
      };
      const result = await failCancel({
        projectRoot,
        subjectRef,
        capabilityId: "subtask.cancel",
        outcomeType: "cancelled",
        outcomeId: subtaskCancelOutcomeId(reread.taskId, reread.hash, input.dispatchRef),
        code: "EVENT_APPEND_FAILED",
        issues: [error instanceof Error ? error.message : String(error)],
        sourceActor,
        now: input.now,
        reconcileRequired: true
      });
      return {
        ...result,
        noop: false,
        resumed: false,
        steps: [...steps, { step: "tombstone", status: "failed", code: result.code }],
        issues: result.issues
      };
    }
  }

  if (!attempt.result.ok) {
    await finalizeSubtaskFailure({ projectRoot, attempt, sourceActor, now: input.now });
    return {
      ...attempt.result,
      noop: false,
      resumed: false,
      steps: [...steps, { step: "tombstone", status: "failed", code: attempt.result.code }],
      issues: attempt.result.issues ?? []
    };
  }

  steps.push({
    step: "tombstone",
    status: attempt.result.noop ? "noop" : "cancelled",
    outcome_id: attempt.result.outcome_id
  });
  return { ok: true, noop: Boolean(attempt.result.noop), resumed: false, steps, issues };
}

async function deleteDraftIfPresent({ projectRoot, requirementId, steps, issues }) {
  try {
    await readBreakdownDraft({ projectRoot, requirementId });
  } catch (error) {
    if (error?.code === "ENOENT" || /breakdown draft not found/.test(error instanceof Error ? error.message : String(error))) {
      steps.push({ step: "breakdown_draft", status: "skipped", reason: "missing" });
      return { ok: true, skipped: true };
    }
    const message = error instanceof Error ? error.message : String(error);
    issues.push(message);
    steps.push({ step: "breakdown_draft", status: "failed", issue: message });
    return { ok: false };
  }

  try {
    const deleted = await deleteBreakdownDraft({ projectRoot, requirementId });
    steps.push({ step: "breakdown_draft", status: "deleted", hash: deleted.hash });
    return { ok: true, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(message);
    steps.push({ step: "breakdown_draft", status: "failed", issue: message });
    return { ok: false };
  }
}

async function readWorktreeRuntimeState(projectRoot, requirementId) {
  const path = requirementWorktreeStatePath(projectRoot, requirementId);
  try {
    return { path, state: JSON.parse(await readFile(path, "utf8")) };
  } catch (error) {
    if (error?.code === "ENOENT") return { path, state: null };
    throw error;
  }
}

async function cleanupWorktree({ projectRoot, requirementId, steps, issues }) {
  let runtime;
  try {
    runtime = await readWorktreeRuntimeState(projectRoot, requirementId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(message);
    steps.push({ step: "worktree", status: "failed", issue: message });
    return { ok: false };
  }

  const status = runtime.state?.aggregate_status ?? runtime.state?.status ?? "missing";
  if (SKIPPED_WORKTREE_STATUSES.has(status)) {
    steps.push({ step: "worktree", status: "skipped", reason: status, state_path: runtime.path });
    return { ok: true, skipped: true };
  }

  try {
    const result = status === "ready"
      ? await discardRequirementWorktree({ projectRoot, requirementId })
      : status === "merged"
        ? await cleanupRequirementWorktree({ projectRoot, requirementId })
        : { status: "escalated", reason: `unsupported_worktree_status:${status}` };
    if (result.status === "escalated") {
      const issue = `worktree ${result.reason}`;
      issues.push(issue);
      steps.push({ step: "worktree", status: "failed", issue, result });
      return { ok: false };
    }
    steps.push({ step: "worktree", status: result.status, state_path: result.statePath ?? runtime.path });
    return { ok: true, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(message);
    steps.push({ step: "worktree", status: "failed", issue: message });
    return { ok: false };
  }
}

async function appendCascadeSummary({
  projectRoot,
  requirementId,
  reason,
  dispatchRef,
  sourceActor,
  now,
  resumed,
  cancelledTaskIds,
  skipped,
  steps,
  issues,
  runKey
}) {
  return await appendEvent(
    {
      type: "requirement_cancel_cascade_completed",
      subject_type: "requirement",
      subject_id: requirementId,
      payload: {
        requirement_id: requirementId,
        reason: normalizeReason(reason),
        dispatch_ref: dispatchRef ?? null,
        cancelled_task_ids: cancelledTaskIds,
        skipped,
        resumed,
        ok: issues.length === 0,
        issues,
        steps
      },
      idempotency_key: `requirement-cancel-cascade:${safeKey(requirementId)}:${runKey}:${resumed ? "resume" : "active"}`,
      emitted_at: now ?? new Date().toISOString(),
      source_actor: sourceActor
    },
    { projectRoot }
  );
}

async function finishRequirementCancel(context, ok) {
  let summary = null;
  try {
    summary = await appendCascadeSummary(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    context.issues.push(message);
    context.steps.push({ step: "summary", status: "failed", issue: message });
  }
  return {
    ok: ok && context.issues.length === 0,
    noop: false,
    resumed: context.resumed,
    steps: context.steps,
    issues: context.issues,
    events: summary ? { requirement_cancel_cascade_completed: summary.event } : {}
  };
}

export async function cancelRequirement(input = {}) {
  const projectRoot = normalizeProjectRoot(input.projectRoot);
  const requirementId = input.requirementId;
  const sourceActor = input.sourceActor ?? "ccb_claude";
  const steps = [];
  const issues = [];
  const cancelledTaskIds = [];
  const skipped = { subtasks: [], breakdown_draft: null, worktree: null };
  const runKey = safeKey(dispatchKey(input.dispatchRef));

  let requirement;
  try {
    requirement = await readRequirement(projectRoot, requirementId);
  } catch (error) {
    const subjectRef = { subject_type: "requirement", subject_id: requirementId ?? "unknown" };
    const result = await failCancel({
      projectRoot,
      subjectRef,
      capabilityId: "requirement.cancel",
      outcomeType: "cancelled",
      outcomeId: `requirement-cancel:${safeKey(requirementId)}:resolve-failed:${runKey}`,
      code: "GUARD_FAILED",
      issues: [error instanceof Error ? error.message : String(error)],
      sourceActor,
      now: input.now
    });
    return { ...result, noop: false, resumed: false, steps, issues: result.issues };
  }

  steps.push({
    step: "resolve",
    requirement_id: requirementId,
    status: requirement.frontmatter.status,
    path: requirement.canonicalPath
  });
  const subjectRef = requirementSubjectRef(requirementId, requirement);

  if (requirement.frontmatter.status === "delivered") {
    const result = await failCancel({
      projectRoot,
      subjectRef,
      capabilityId: "requirement.cancel",
      outcomeType: "cancelled",
      outcomeId: `requirement-cancel:${safeKey(requirementId)}:${safeKey(requirement.hash)}:terminal:${runKey}`,
      code: "GUARD_FAILED",
      issues: ["requirement.cancel cannot override delivered requirement"],
      sourceActor,
      now: input.now
    });
    return { ...result, noop: false, resumed: false, steps, issues: result.issues };
  }

  const resumed = requirement.frontmatter.status === "cancelled";
  if (resumed) {
    steps.push({ step: "tombstone", status: "skipped", reason: "already_cancelled" });
  } else {
    let tombstone;
    try {
      tombstone = await applyRequirementCancel({
        projectRoot,
        requirementId,
        requirement,
        reason: input.reason,
        sourceActor,
        dispatchRef: input.dispatchRef,
        now: input.now,
        authorized: input.authorized,
        testHooks: input.testHooks
      });
    } catch (error) {
      const result = await failCancel({
        projectRoot,
        subjectRef,
        capabilityId: "requirement.cancel",
        outcomeType: "cancelled",
        outcomeId: requirementCancelOutcomeId(requirementId, requirement.hash, input.dispatchRef),
        code: "EVENT_APPEND_FAILED",
        issues: [error instanceof Error ? error.message : String(error)],
        sourceActor,
        now: input.now,
        reconcileRequired: true
      });
      return {
        ...result,
        noop: false,
        resumed: false,
        steps: [...steps, { step: "tombstone", status: "failed", code: result.code }],
        issues: result.issues
      };
    }
    if (!tombstone.result.ok) {
      return {
        ...tombstone.result,
        noop: false,
        resumed: false,
        steps: [...steps, { step: "tombstone", status: "failed", code: tombstone.result.code }],
        issues: tombstone.result.issues ?? []
      };
    }
    steps.push({ step: "tombstone", status: tombstone.result.noop ? "noop" : "cancelled", outcome_id: tombstone.result.outcome_id });
  }

  let tasks;
  try {
    tasks = await listDevTasksByRequirement({ projectRoot, requirementId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(message);
    steps.push({ step: "subtasks", status: "failed", issue: message });
    return await finishRequirementCancel({
      projectRoot,
      requirementId,
      reason: input.reason,
      dispatchRef: input.dispatchRef,
      sourceActor,
      now: input.now,
      resumed,
      cancelledTaskIds,
      skipped,
      steps,
      issues,
      runKey
    }, false);
  }

  for (const task of tasks) {
    if (TERMINAL_SUBTASK_STATUSES.has(task.status)) {
      skipped.subtasks.push({ task_id: task.taskId, reason: task.status });
      continue;
    }
    const result = await cancelSubtask({
      projectRoot,
      taskId: task.taskId,
      requirementId,
      reason: input.reason,
      sourceActor,
      dispatchRef: input.dispatchRef,
      now: input.now,
      authorized: input.authorized,
      testHooks: input.testHooks
    });
    if (!result.ok) {
      issues.push(...(result.issues ?? [`subtask cancel failed: ${task.taskId}`]));
      steps.push({ step: "subtask", task_id: task.taskId, status: "failed", code: result.code });
      return await finishRequirementCancel({
        projectRoot,
        requirementId,
        reason: input.reason,
        dispatchRef: input.dispatchRef,
        sourceActor,
        now: input.now,
        resumed,
        cancelledTaskIds,
        skipped,
        steps,
        issues,
        runKey
      }, false);
    }
    if (result.noop) {
      skipped.subtasks.push({ task_id: task.taskId, reason: "terminal_after_reread" });
    } else {
      cancelledTaskIds.push(task.taskId);
    }
  }
  steps.push({ step: "subtasks", status: "completed", cancelled_task_ids: cancelledTaskIds, skipped: skipped.subtasks });

  const draftResult = await deleteDraftIfPresent({ projectRoot, requirementId, steps, issues });
  skipped.breakdown_draft = draftResult.skipped ? "missing" : null;
  if (!draftResult.ok) {
    return await finishRequirementCancel({
      projectRoot,
      requirementId,
      reason: input.reason,
      dispatchRef: input.dispatchRef,
      sourceActor,
      now: input.now,
      resumed,
      cancelledTaskIds,
      skipped,
      steps,
      issues,
      runKey
    }, false);
  }

  const worktreeResult = await cleanupWorktree({ projectRoot, requirementId, steps, issues });
  const worktreeStep = [...steps].reverse().find((step) => step.step === "worktree");
  skipped.worktree = worktreeResult.skipped ? worktreeStep?.reason ?? "missing" : null;
  if (!worktreeResult.ok) {
    return await finishRequirementCancel({
      projectRoot,
      requirementId,
      reason: input.reason,
      dispatchRef: input.dispatchRef,
      sourceActor,
      now: input.now,
      resumed,
      cancelledTaskIds,
      skipped,
      steps,
      issues,
      runKey
    }, false);
  }

  return await finishRequirementCancel({
    projectRoot,
    requirementId,
    reason: input.reason,
    dispatchRef: input.dispatchRef,
    sourceActor,
    now: input.now,
    resumed,
    cancelledTaskIds,
    skipped,
    steps,
    issues,
    runKey
  }, true);
}
