import { readdir, readFile, stat } from "node:fs/promises";
import { basename, join, relative } from "node:path";

import { resolveDocType } from "../docs-structure/index.mjs";
import { ConflictError, ValidationError, hashContent, safeWriteFile } from "../runtime/index.mjs";
import { validateTaskStateBusinessRules } from "./business-rules.mjs";

export { validateTaskStateBusinessRules } from "./business-rules.mjs";

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function docsPath(projectRoot, ...parts) {
  return join(projectRoot, "docs", ".ccb", ...parts);
}

function projectContractPath(projectRoot) {
  return docsPath(projectRoot, "docs-structure-contract.yaml");
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

async function resolveDevTaskDirectory(projectRoot) {
  const contractPath = projectContractPath(projectRoot);
  const options = (await fileExists(contractPath)) ? { contractPath } : {};
  const resolved = await resolveDocType("dev_task", options);
  return join(projectRoot, resolved.directory);
}

function documentMapCachePath(projectRoot) {
  return docsPath(projectRoot, "index", "document-map.json");
}

async function listMarkdownFiles(root) {
  const files = [];
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
      } else if (entry.isFile() && entry.name.endsWith(".md") && !basename(path).startsWith("_模板_")) {
        files.push(path);
      }
    }
  }
  await walk(root);
  return files.sort();
}

function safeRelativePath(path) {
  if (typeof path !== "string" || path.trim().length === 0) return null;
  if (path.startsWith("/") || path.includes("\0")) return null;
  const normalized = normalizePath(path);
  if (normalized === ".." || normalized.startsWith("../")) return null;
  return normalized;
}

function isPathUnderRoot(projectRoot, path, root) {
  const relativePath = normalizePath(relative(projectRoot, path));
  const relativeRoot = normalizePath(relative(projectRoot, root));
  return relativePath === relativeRoot || relativePath.startsWith(`${relativeRoot}/`);
}

function parseLiteral(value) {
  if (typeof value !== "string") return value;
  if (/^-?\d+$/.test(value.trim())) return Number.parseInt(value.trim(), 10);
  return value;
}

function parseFrontmatter(content) {
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!matched) return { frontmatter: {}, body: content, lines: [] };
  const frontmatter = {};
  const lines = matched[1].split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    frontmatter[key] = parseLiteral(value);
  }
  return { frontmatter, body: matched[2], lines };
}

function isDevTaskMatch(parsed, taskId) {
  return frontmatterValue(parsed.lines, "doc_type") === "dev_task" && frontmatterValue(parsed.lines, "task_id") === taskId;
}

function frontmatterValue(lines, field) {
  const line = lines.find((item) => item.slice(0, item.indexOf(":")).trim() === field);
  if (!line) return null;
  return line.slice(line.indexOf(":") + 1).trim().replace(/^['"]|['"]$/g, "");
}

function renderScalar(value) {
  if (Array.isArray(value)) return `[${value.join(", ")}]`;
  return String(value);
}

function upsertFrontmatterLine(lines, field, value, afterField = null) {
  if (value === undefined || value === null) return lines;
  const next = [...lines];
  const rendered = `${field}: ${renderScalar(value)}`;
  const existingIndex = next.findIndex((line) => line.slice(0, line.indexOf(":")).trim() === field);
  if (existingIndex >= 0) {
    next[existingIndex] = rendered;
    return next;
  }
  const afterIndex = afterField
    ? next.findIndex((line) => line.slice(0, line.indexOf(":")).trim() === afterField)
    : -1;
  next.splice(afterIndex >= 0 ? afterIndex + 1 : next.length, 0, rendered);
  return next;
}

function normalizeStatus(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (["done", "archived", "completed", "complete"].includes(value)) return "done";
  if (value === "cancelled") return "cancelled";
  if ([
    "active",
    "planning",
    "dispatch_ready",
    "dispatched",
    "implementing",
    "reviewing",
    "blocked"
  ].includes(value)) return "reviewing";
  return value;
}

function normalizePatch(patch = {}) {
  const next = {};
  for (const field of [
    "status",
    "current_node",
    "node_substate",
    "review_status",
    "verification_result",
    "review_followup",
    "blocked_reason"
  ]) {
    if (patch[field] !== undefined) next[field] = patch[field];
  }
  if (next.status !== undefined) next.status = normalizeStatus(next.status);
  if (next.current_node === "archive") {
    if (next.status === undefined) next.status = "done";
    if (next.node_substate === undefined) next.node_substate = "archived";
  }
  if (next.status === "done" && next.current_node === undefined && next.node_substate === "archived") {
    next.current_node = "archive";
  }
  return next;
}

async function readDocumentMapCache(projectRoot, devTaskRoot) {
  const cachePath = documentMapCachePath(projectRoot);
  let cacheStat;
  let rootStat;
  let content;
  try {
    [cacheStat, rootStat, content] = await Promise.all([
      stat(cachePath),
      stat(devTaskRoot),
      readFile(cachePath, "utf8")
    ]);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }

  // A dev_task file added/removed after the cache was generated can hide
  // duplicates, so fall back to the authoritative scan in that case.
  if (rootStat.mtimeMs > cacheStat.mtimeMs + 1) return null;

  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function taskPathsFromDocumentMap(cache, taskId) {
  const direct = cache?.dev_task_paths_by_task_id?.[taskId] ?? cache?.devTaskPathsByTaskId?.[taskId];
  if (typeof direct === "string") return [direct];
  if (Array.isArray(direct)) return direct;

  if (Array.isArray(cache?.documents)) {
    return cache.documents
      .filter((entry) => entry?.docType === "dev_task" && (entry.task_id ?? entry.taskId) === taskId)
      .map((entry) => entry.path);
  }
  return [];
}

async function findDevTaskDocumentFromCache(projectRoot, taskId, devTaskRoot) {
  const cache = await readDocumentMapCache(projectRoot, devTaskRoot);
  if (!cache) return null;

  const candidatePaths = [
    ...new Set(
      taskPathsFromDocumentMap(cache, taskId)
        .map((path) => safeRelativePath(path))
        .filter(Boolean)
    )
  ];
  if (candidatePaths.length === 0) return null;

  const matches = [];
  for (const relativePath of candidatePaths) {
    const absolutePath = join(projectRoot, relativePath);
    if (!isPathUnderRoot(projectRoot, absolutePath, devTaskRoot)) {
      return null;
    }
    let content;
    try {
      content = await readFile(absolutePath, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
    const parsed = parseFrontmatter(content);
    if (!isDevTaskMatch(parsed, taskId)) return null;
    matches.push({ path: absolutePath, content, ...parsed });
  }

  if (matches.length > 1) {
    throw new ConflictError(`multiple dev_task documents found for task_id ${taskId}`, {
      issues: matches.map((match) => normalizePath(relative(projectRoot, match.path)))
    });
  }
  return matches[0] ?? null;
}

async function findDevTaskDocumentByScan(projectRoot, taskId, root) {
  const matches = [];
  for (const file of await listMarkdownFiles(root)) {
    const content = await readFile(file, "utf8");
    const parsed = parseFrontmatter(content);
    if (isDevTaskMatch(parsed, taskId)) {
      matches.push({ path: file, content, ...parsed });
    }
  }
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new ConflictError(`multiple dev_task documents found for task_id ${taskId}`, {
      issues: matches.map((match) => normalizePath(relative(projectRoot, match.path)))
    });
  }
  return matches[0];
}

async function findDevTaskDocument(projectRoot, taskId) {
  const root = await resolveDevTaskDirectory(projectRoot);
  return (await findDevTaskDocumentFromCache(projectRoot, taskId, root)) ?? await findDevTaskDocumentByScan(projectRoot, taskId, root);
}

export function renderTaskState(input) {
  const now = input.created_at ?? input.updated_at ?? input.now ?? new Date().toISOString();
  return [
    "---",
    "doc_type: dev_task",
    `task_id: ${input.taskId}`,
    `title: ${input.title || input.taskId}`,
    `status: ${normalizeStatus(input.status) ?? "reviewing"}`,
    `current_node: ${input.current_node ?? "dispatch"}`,
    `node_substate: ${input.node_substate ?? "awaiting_codex_pickup"}`,
    ...(input.review_status ? [`review_status: ${input.review_status}`] : []),
    `priority: ${input.priority ?? "medium"}`,
    `requirement_id: ${input.requirement_id ?? "unknown-requirement"}`,
    `section_id: ${input.section_id ?? "pr1-dev-task-frontmatter"}`,
    `order: ${input.order ?? 1}`,
    `implementation_owner: ${input.implementation_owner ?? "ccb_codex"}`,
    `dependencies: ${renderScalar(input.dependencies ?? [])}`,
    `source_breakdown_draft: ${input.source_breakdown_draft ?? "docs/.ccb/drafts/breakdown/unknown-requirement.json"}`,
    `source_draft_hash: ${input.source_draft_hash ?? "0".repeat(64)}`,
    `created_at: ${now}`,
    "---",
    "",
    input.body?.trim() || `# ${input.title || input.taskId}\n\n- Dev task state is stored in this human-readable document frontmatter.`,
    ""
  ].join("\n");
}

export async function readTaskState({ projectRoot, taskId }) {
  const current = await findDevTaskDocument(projectRoot, taskId);
  if (!current) return null;
  validateTaskStateBusinessRules(current.frontmatter);
  return {
    path: current.path,
    content: current.content,
    hash: hashContent(current.content),
    frontmatter: current.frontmatter,
    body: current.body
  };
}

export async function writeTaskState({
  projectRoot,
  taskId,
  title,
  patch,
  expectedHash,
  now = new Date().toISOString(),
  updatedBy = "reconcile",
  body,
  audit
}) {
  const current = await findDevTaskDocument(projectRoot, taskId);
  if (!current) {
    throw new ValidationError(`dev_task document not found for task_id ${taskId}`, {
      issues: [`task_id ${taskId} not found under docs/03 dev_task directory`]
    });
  }

  const normalizedPatch = normalizePatch(patch);
  let lines = [...current.lines];
  for (const [field, value] of Object.entries(normalizedPatch)) {
    lines = upsertFrontmatterLine(lines, field, value, field === "review_status" ? "node_substate" : null);
  }
  if (title) lines = upsertFrontmatterLine(lines, "title", title, "task_id");
  lines = upsertFrontmatterLine(lines, "updated_at", now, "created_at");
  lines = upsertFrontmatterLine(lines, "updated_by", updatedBy, "updated_at");

  const nextBody = body ?? current.body;
  const content = ["---", ...lines, "---", "", nextBody.replace(/^\n+/, "")].join("\n");
  const parsed = parseFrontmatter(content);
  validateTaskStateBusinessRules(parsed.frontmatter);
  const relativePath = normalizePath(relative(projectRoot, current.path));
  const writeResult = await safeWriteFile(current.path, content.endsWith("\n") ? content : `${content}\n`, {
    expectedHash: expectedHash ?? hashContent(current.content),
    schemaName: "dev-task",
    audit: {
      projectRoot,
      subjectType: "subtask",
      subjectId: taskId,
      sourceActor: updatedBy,
      resourceType: "dev_task",
      operation: "writeDevTaskState",
      plannedDiff: normalizedPatch,
      targetPath: relativePath,
      ...audit
    }
  });
  return {
    path: current.path,
    content,
    hash: writeResult.hash,
    frontmatter: parsed.frontmatter
  };
}
