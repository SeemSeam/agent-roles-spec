import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { hashContent, safeWriteFile } from "../runtime/index.mjs";
import { readTaskState, writeTaskState } from "../state/index.mjs";

function parseLiteral(value) {
  if (typeof value !== "string") return value;
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  return value;
}

function yamlSetScalar(content, key, value) {
  const line = `${key}: ${value}`;
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!matched) {
    return ["---", line, "---", "", content.trimStart()].join("\n");
  }
  const lines = matched[1].split(/\r?\n/);
  const index = lines.findIndex((item) => new RegExp(`^${key}\\s*:`).test(item.trim()));
  const nextLines = index === -1
    ? [...lines, line]
    : [...lines.slice(0, index), line, ...lines.slice(index + 1)];
  return ["---", ...nextLines, "---", matched[2]].join("\n");
}

export function resolveStateEffects({ policy, stateInput = {}, current = {} }) {
  const patch = {};
  const issues = [];
  for (const [field, rule] of Object.entries(policy.state_effects ?? {})) {
    if (rule === "preserve") continue;
    if (rule === "set_from_input") {
      if (stateInput[field] === undefined) {
        issues.push(`state input missing ${field}`);
      } else {
        patch[field] = stateInput[field];
      }
      continue;
    }
    if (rule === "set_from_input_optional") {
      if (stateInput[field] !== undefined) patch[field] = stateInput[field];
      continue;
    }
    if (typeof rule === "string" && rule.startsWith("set:")) {
      patch[field] = parseLiteral(rule.slice(4));
      continue;
    }
    issues.push(`unsupported state effect ${field}: ${rule}`);
  }
  return { ok: issues.length === 0, issues, patch, stateEffects: { ...current, ...patch } };
}

export async function applyTaskStateEffects({
  projectRoot,
  subjectRef,
  policy,
  stateInput,
  expectedHash,
  now,
  sourceActor,
  audit
}) {
  const current = await readTaskState({ projectRoot, taskId: subjectRef.subject_id });
  const resolved = resolveStateEffects({ policy, stateInput, current: current?.frontmatter ?? {} });
  if (!resolved.ok) return { ok: false, issues: resolved.issues };
  const patch = {
    ...resolved.patch
  };
  const write = await writeTaskState({
    projectRoot,
    taskId: subjectRef.subject_id,
    patch,
    expectedHash: expectedHash ?? subjectRef.base_hash ?? current?.hash,
    now,
    updatedBy: sourceActor,
    audit
  });
  return { ok: true, patch, stateEffects: write.frontmatter, writeResult: { path: write.path, hash: write.hash } };
}

export async function applyRequirementMarkdownEffects({
  projectRoot,
  subjectRef,
  policy,
  stateInput,
  expectedHash,
  sourceActor,
  audit
}) {
  if (!subjectRef.canonical_path) {
    return { ok: false, issues: ["requirement subjectRef.canonical_path is required"] };
  }
  const path = join(projectRoot, subjectRef.canonical_path);
  const before = await readFile(path, "utf8");
  const currentHash = hashContent(before);
  const resolved = resolveStateEffects({ policy, stateInput, current: {} });
  if (!resolved.ok) return { ok: false, issues: resolved.issues };
  let next = before;
  for (const [field, value] of Object.entries(resolved.patch)) {
    next = yamlSetScalar(next, field, value);
  }
  if (!next.endsWith("\n")) next = `${next}\n`;
  const write = await safeWriteFile(path, next, {
    expectedHash: expectedHash ?? subjectRef.base_hash ?? currentHash,
    audit: {
      projectRoot,
      subjectType: "requirement",
      subjectId: subjectRef.subject_id,
      sourceActor,
      resourceType: "requirement_md",
      operation: "applyCapabilityOutcome",
      plannedDiff: resolved.patch,
      targetPath: subjectRef.canonical_path,
      ...audit
    }
  });
  return { ok: true, patch: resolved.patch, stateEffects: resolved.patch, writeResult: write };
}

export function canonicalLockPath(projectRoot, subjectRef, writeTarget) {
  if (writeTarget === "dev_task") {
    return join(projectRoot, "docs", ".ccb", "locks", `dev-task-${subjectRef.subject_id}.capability-outcome`);
  }
  if (writeTarget === "requirement_md" && subjectRef.canonical_path) {
    return `${join(projectRoot, subjectRef.canonical_path)}.capability-outcome`;
  }
  return join(projectRoot, "docs", ".ccb", "capability-outcome", `${subjectRef.subject_type}-${subjectRef.subject_id}.lock`);
}
