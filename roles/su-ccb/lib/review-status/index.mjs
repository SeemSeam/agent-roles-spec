import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

import { resolveDocType } from "../docs-structure/index.mjs";
import { ConflictError, ValidationError, hashContent, safeWriteFile } from "../runtime/index.mjs";

const SOURCE_ACTOR = "ccb_claude";
const ALLOWED_REVIEW_STATUSES = new Set(["passed", "failed"]);

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

async function fileExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function resolveProjectDocType(projectRoot, docType) {
  const contractPath = join(projectRoot, "docs", ".ccb", "docs-structure-contract.yaml");
  const options = (await fileExists(contractPath)) ? { contractPath } : {};
  return await resolveDocType(docType, options);
}

async function listMarkdownFiles(root) {
  const found = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.startsWith("_模板_")) {
        found.push(fullPath);
      }
    }
  }
  await walk(root);
  return found;
}

function splitFrontmatter(content) {
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!matched) {
    throw new ValidationError("dev_task markdown must start with YAML frontmatter", {
      issues: ["frontmatter missing"]
    });
  }
  return {
    lines: matched[1].split(/\r?\n/),
    body: matched[2]
  };
}

function frontmatterValue(lines, field) {
  for (const line of lines) {
    const index = line.indexOf(":");
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    if (key !== field) continue;
    return line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
  }
  return null;
}

function upsertFrontmatterLine(lines, field, value, afterField) {
  const next = [...lines];
  const existingIndex = next.findIndex((line) => line.slice(0, line.indexOf(":")).trim() === field);
  const rendered = `${field}: ${value}`;
  if (existingIndex >= 0) {
    next[existingIndex] = rendered;
    return next;
  }
  const afterIndex = next.findIndex((line) => line.slice(0, line.indexOf(":")).trim() === afterField);
  next.splice(afterIndex >= 0 ? afterIndex + 1 : next.length, 0, rendered);
  return next;
}

async function findDevTaskDocument(projectRoot, taskId) {
  const resolved = await resolveProjectDocType(projectRoot, "dev_task");
  const root = join(projectRoot, resolved.directory);
  const matches = [];
  for (const file of await listMarkdownFiles(root)) {
    const content = await readFile(file, "utf8");
    const { lines } = splitFrontmatter(content);
    if (frontmatterValue(lines, "doc_type") === "dev_task" && frontmatterValue(lines, "task_id") === taskId) {
      matches.push({ path: file, content, lines });
    }
  }
  if (matches.length === 0) {
    throw new ValidationError(`dev_task document not found for task_id ${taskId}`, {
      issues: [`task_id ${taskId} not found under ${resolved.directory}`]
    });
  }
  if (matches.length > 1) {
    throw new ConflictError(`multiple dev_task documents found for task_id ${taskId}`, {
      issues: matches.map((match) => normalizePath(relative(projectRoot, match.path)))
    });
  }
  return matches[0];
}

export async function writeDevTaskReviewStatus({ projectRoot, taskId, reviewStatus }) {
  if (!ALLOWED_REVIEW_STATUSES.has(reviewStatus)) {
    throw new ValidationError("review_status must be passed or failed", {
      issues: [`review_status ${reviewStatus ?? "<missing>"} is not allowed`]
    });
  }

  const current = await findDevTaskDocument(projectRoot, taskId);
  const { body } = splitFrontmatter(current.content);
  const nextLines = upsertFrontmatterLine(current.lines, "review_status", reviewStatus, "node_substate");
  const nextContent = ["---", ...nextLines, "---", "", body].join("\n");
  const fileStat = await stat(current.path);
  const relativePath = normalizePath(relative(projectRoot, current.path));

  const writeResult = await safeWriteFile(current.path, nextContent, {
    expectedHash: hashContent(current.content),
    schemaName: "dev-task",
    audit: {
      projectRoot,
      subjectType: "subtask",
      subjectId: taskId,
      sourceActor: SOURCE_ACTOR,
      resourceType: "dev_task",
      operation: "writeDevTaskReviewStatus",
      runId: `dev-task-review:${taskId}:${reviewStatus}:${fileStat.mtimeMs}`,
      targetPath: relativePath,
      plannedDiff: {
        review_status: reviewStatus
      }
    }
  });

  return {
    taskId,
    reviewStatus,
    path: relativePath,
    hash: writeResult.hash
  };
}
