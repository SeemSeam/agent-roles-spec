import { readdir, readFile, stat } from "node:fs/promises";
import { isAbsolute, join, normalize, relative } from "node:path";

import { resolveDocType } from "../docs-structure/index.mjs";
import { hashFile, validateAgainstSchema } from "../runtime/index.mjs";
import { ALLOWED_EVIDENCE_CHECK_IDS } from "./generated-policy.mjs";

function safeRelativePath(path) {
  if (typeof path !== "string" || path.trim().length === 0) return null;
  if (isAbsolute(path)) return null;
  const normalized = normalize(path);
  if (normalized === ".." || normalized.startsWith(`..${"/"}`) || normalized.startsWith(`..${"\\"}`)) return null;
  return normalized;
}

function parseFrontmatter(content) {
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!matched) return {};
  const frontmatter = {};
  for (const line of matched[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    frontmatter[key] = key === "progress" && /^-?\d+$/.test(value) ? Number.parseInt(value, 10) : value;
  }
  return frontmatter;
}

function uniqueStrings(value) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    return null;
  }
  const normalized = value.map((item) => item.trim());
  return new Set(normalized).size === normalized.length ? normalized : null;
}

function sameStringSet(left, right) {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((item) => rightSet.has(item));
}

function taskKeysFromPayloadMembers(members) {
  if (!Array.isArray(members)) return [];
  return members
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") return item.task_key ?? item.taskId ?? item.task_id;
      return null;
    })
    .filter((item) => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function executionOrderFromPayload(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function findBatchAuthorizationEvent(events, params) {
  const authorizationEventId = typeof params.authorization_event_id === "string"
    ? params.authorization_event_id.trim()
    : null;
  const candidates = events.filter((event) => event?.type === "batch_authorization_completed");
  if (authorizationEventId) {
    return candidates.find((event) => event.idempotency_key === authorizationEventId || event.payload?.batch_id === authorizationEventId) ?? null;
  }
  if (typeof params.requirement_id === "string") {
    return candidates.find((event) => event.payload?.requirement_id === params.requirement_id) ?? null;
  }
  return null;
}

async function readJournal(projectRoot) {
  const path = join(projectRoot, "docs", ".ccb", "events", "journal.jsonl");
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  return content
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .flatMap((line) => {
      try {
        return [JSON.parse(line)];
      } catch {
        return [];
      }
    });
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
  return resolved.directory.replace(/\\/g, "/");
}

async function countGlob(projectRoot, selector) {
  let root = null;
  let predicate = (entry) => entry.endsWith(".md");
  if (selector === "requirement_docs") {
    root = join(projectRoot, await resolveDocDirectory(projectRoot, "requirement"));
  } else if (selector === "dev_task_docs") {
    root = join(projectRoot, await resolveDocDirectory(projectRoot, "dev_task"));
  } else if (selector === "batch_authorizations") {
    const events = await readJournal(projectRoot);
    return events.filter((event) => event?.type === "batch_authorization_completed").length;
  }
  if (!root) return 0;
  const entries = await readdir(root).catch(() => []);
  return entries.filter(predicate).length;
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
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(path);
    }
  }
  return files;
}

export async function runEvidenceCheck(projectRoot, evidence) {
  const checkId = evidence?.check_id;
  if (!ALLOWED_EVIDENCE_CHECK_IDS.includes(checkId)) {
    return { ok: false, reason: `unknown evidence check: ${checkId}` };
  }
  const params = evidence.params ?? {};
  try {
    if (checkId === "file_exists") {
      const path = safeRelativePath(params.path);
      if (!path) return { ok: false, reason: "path must be project-relative" };
      await stat(join(projectRoot, path));
      return { ok: true };
    }

    if (checkId === "hash_matches") {
      const path = safeRelativePath(params.path);
      if (!path) return { ok: false, reason: "path must be project-relative" };
      if (typeof params.expected_hash !== "string" || !/^[a-f0-9]{64}$/.test(params.expected_hash)) {
        return { ok: false, reason: "expected_hash must be sha256 hex" };
      }
      const actual = await hashFile(join(projectRoot, path));
      return actual === params.expected_hash
        ? { ok: true, actual_hash: actual }
        : { ok: false, reason: "hash mismatch", actual_hash: actual };
    }

    if (checkId === "schema_valid") {
      const path = safeRelativePath(params.path);
      if (!path) return { ok: false, reason: "path must be project-relative" };
      const content = await readFile(join(projectRoot, path), "utf8");
      await validateAgainstSchema(content, params.schema_name);
      return { ok: true };
    }

    if (checkId === "journal_event_exists") {
      const events = await readJournal(projectRoot);
      const matched = events.find((event) =>
        event.idempotency_key === params.idempotency_key &&
        (!params.event_type || event.type === params.event_type)
      );
      return matched ? { ok: true, event: matched } : { ok: false, reason: "journal event not found" };
    }

    if (checkId === "count_gt_zero") {
      let count = 0;
      if (params.source_type === "event_journal") {
        const events = await readJournal(projectRoot);
        count = params.selector === "any_event"
          ? events.length
          : events.filter((event) => event.type === params.selector).length;
      } else if (params.source_type === "glob") {
        count = await countGlob(projectRoot, params.selector);
      } else if (params.source_type === "json_file") {
        const path = safeRelativePath(params.path);
        if (!path) return { ok: false, reason: "path must be project-relative" };
        const parsed = JSON.parse(await readFile(join(projectRoot, path), "utf8"));
        const value = params.selector ? parsed?.[params.selector] : parsed;
        count = Array.isArray(value) ? value.length : 0;
      }
      return count > 0 ? { ok: true, count } : { ok: false, reason: "count is zero", count };
    }

    if (checkId === "dev_task_scope_terminal") {
      const taskKeys = uniqueStrings(params.task_keys);
      const devTaskPaths = uniqueStrings(params.dev_task_paths);
      if (!taskKeys || taskKeys.length === 0) return { ok: false, reason: "task_keys must be a non-empty unique string array" };
      if (!devTaskPaths || devTaskPaths.length !== taskKeys.length) {
        return { ok: false, reason: "dev_task_paths must be a unique string array with the same length as task_keys" };
      }
      const authorizationEvent = findBatchAuthorizationEvent(await readJournal(projectRoot), params);
      if (!authorizationEvent) return { ok: false, reason: "batch authorization EventJournal event not found" };
      const authorizationPayload = authorizationEvent.payload ?? {};
      if (authorizationPayload.status !== "completed") {
        return { ok: false, reason: "batch authorization event status must be completed" };
      }
      if (params.requirement_id && authorizationPayload.requirement_id !== params.requirement_id) {
        return { ok: false, reason: "batch authorization requirement_id mismatch" };
      }
      const memberTaskKeys = taskKeysFromPayloadMembers(authorizationPayload.members);
      const executionOrder = executionOrderFromPayload(authorizationPayload.execution_order);
      if (memberTaskKeys.length === 0) return { ok: false, reason: "batch authorization has no members.task_key scope" };
      if (!sameStringSet(memberTaskKeys, taskKeys)) return { ok: false, reason: "task_keys do not match batch members.task_key scope" };
      if (executionOrder.length > 0 && !sameStringSet(executionOrder, memberTaskKeys)) {
        return { ok: false, reason: "batch execution_order does not match members.task_key scope" };
      }

      const expectedTaskKeys = new Set(taskKeys);
      const seenTaskKeys = new Set();
      const devTaskDirectory = await resolveDocDirectory(projectRoot, "dev_task");
      for (const rawPath of devTaskPaths) {
        const path = safeRelativePath(rawPath);
        if (!path) return { ok: false, reason: "dev_task path must be project-relative" };
        const normalizedPath = path.replace(/\\/g, "/");
        if (!normalizedPath.startsWith(devTaskDirectory) || !normalizedPath.endsWith(".md")) {
          return { ok: false, reason: `dev_task path must be under ${devTaskDirectory}: ${rawPath}` };
        }
        const frontmatter = parseFrontmatter(await readFile(join(projectRoot, path), "utf8"));
        if (frontmatter.doc_type !== "dev_task") {
          return { ok: false, reason: `${rawPath} doc_type must be dev_task` };
        }
        const taskId = frontmatter.task_id;
        if (!expectedTaskKeys.has(taskId)) return { ok: false, reason: `dev_task task_id outside scope: ${taskId}` };
        if (seenTaskKeys.has(taskId)) return { ok: false, reason: `duplicate dev_task task_id: ${taskId}` };
        seenTaskKeys.add(taskId);
        if (frontmatter.current_node !== "archive") return { ok: false, reason: `${taskId} current_node is not archive` };
        if (frontmatter.status !== "done") return { ok: false, reason: `${taskId} status is not done` };
        if (frontmatter.review_status === undefined) return { ok: false, reason: `${taskId} review_status missing in dev_task frontmatter` };
        if (frontmatter.review_status !== "passed") return { ok: false, reason: `${taskId} review_status is not passed` };
      }

      if (seenTaskKeys.size !== expectedTaskKeys.size) return { ok: false, reason: "dev_task scope does not match task_keys" };
      return { ok: true, task_count: seenTaskKeys.size };
    }

    if (checkId === "dev_task_requirement_terminal") {
      const requirementId = typeof params.requirement_id === "string" ? params.requirement_id.trim() : "";
      if (!requirementId) return { ok: false, reason: "requirement_id must be a non-empty string" };

      const devTaskDirectory = await resolveDocDirectory(projectRoot, "dev_task");
      const devTaskRoot = join(projectRoot, devTaskDirectory);
      const tasks = [];
      for (const path of await listMarkdownFiles(devTaskRoot)) {
        const relativePath = relative(projectRoot, path).replace(/\\/g, "/");
        const frontmatter = parseFrontmatter(await readFile(path, "utf8"));
        if (frontmatter.doc_type !== "dev_task" || frontmatter.requirement_id !== requirementId) continue;
        tasks.push({ path: relativePath, frontmatter });
      }

      const activeTasks = tasks.filter(({ frontmatter }) => frontmatter.status !== "cancelled");
      if (activeTasks.length === 0) {
        return { ok: false, reason: "no non-cancelled dev_task found for requirement", task_count: 0 };
      }

      for (const { path, frontmatter } of activeTasks) {
        const taskId = frontmatter.task_id ?? path;
        if (frontmatter.current_node !== "archive") return { ok: false, reason: `${taskId} current_node is not archive` };
        if (frontmatter.status !== "done") return { ok: false, reason: `${taskId} status is not done` };
        if (frontmatter.review_status === undefined) {
          return { ok: false, reason: `${taskId} review_status missing in dev_task frontmatter` };
        }
        if (frontmatter.review_status !== "passed") return { ok: false, reason: `${taskId} review_status is not passed` };
      }

      return {
        ok: true,
        task_count: activeTasks.length,
        cancelled_count: tasks.length - activeTasks.length,
        task_ids: activeTasks.map(({ frontmatter }) => frontmatter.task_id).filter(Boolean)
      };
    }

    return { ok: false, reason: `unsupported check: ${checkId}` };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function evidenceMatchesRequirement(evidence, required) {
  return evidence?.kind === required.kind && evidence?.check_id === required.check_id;
}

export async function validateEvidenceSet({ projectRoot, policy, evidence = [], outcomeId }) {
  const issues = [];
  const required = policy.evidence_required ?? { mode: "none", items: [] };

  for (const item of evidence) {
    if (
      policy.guards?.includes("no_self_referential_event") &&
      item?.params?.idempotency_key === `capability-outcome:${outcomeId}:applied`
    ) {
      issues.push("evidence must not reference current outcome event");
      continue;
    }
    const result = await runEvidenceCheck(projectRoot, item);
    if (!result.ok) issues.push(`evidence ${item.check_id} failed: ${result.reason}`);
  }

  if (required.mode !== "none") {
    const requiredResults = await Promise.all(
      required.items.map(async (requiredItem) => {
        const candidate = evidence.find((item) => evidenceMatchesRequirement(item, requiredItem));
        if (!candidate) return { ok: false, reason: `missing required evidence ${requiredItem.kind}:${requiredItem.check_id}` };
        return await runEvidenceCheck(projectRoot, candidate);
      })
    );
    if (required.mode === "all") {
      for (const result of requiredResults) {
        if (!result.ok) issues.push(result.reason);
      }
    } else if (!requiredResults.some((result) => result.ok)) {
      issues.push("no required evidence item passed");
    }
  }

  return { ok: issues.length === 0, issues };
}

export function projectRelativePath(projectRoot, path) {
  return relative(projectRoot, path).replace(/\\/g, "/");
}
