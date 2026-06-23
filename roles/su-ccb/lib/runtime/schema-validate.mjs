import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasUsefulMarkdown, isIsoDate } from "../business-rules-utils.mjs";
import { IOError, ValidationError } from "./errors.mjs";

const runtimeDir = dirname(fileURLToPath(import.meta.url));
const pluginRoot = join(runtimeDir, "..", "..");
const schemaDir = join(pluginRoot, "references", "kernel", "schemas");

const BREAKDOWN_STATUSES = new Set(["draft", "reviewing", "approved", "consumed", "cancelled"]);
const GENERATED_BY = new Set(["ai_session", "manual"]);
const GENERATION_SOURCE_KEYS = new Set(["cc_agent", "cx_agent", "ccb_job_id", "manual_actor"]);
const PRIORITIES = new Set(["high", "medium", "low"]);
const OWNERS = new Set(["claude", "ccb_codex"]);
const REVIEW_ACTORS = new Set(["ai", "user"]);
const REVIEW_ACTIONS = new Set(["created", "edited", "status_changed", "rejected"]);
const TASK_STATUSES = new Set(["active", "blocked", "archived", "done"]);
const TASK_CURRENT_NODES = new Set(["dispatch", "implementation", "review", "archive"]);
const TASK_RUNTIME_STATES = new Set(["pending", "running", "completed", "failed", "idle"]);
const DEV_TASK_DOC_TYPES = new Set(["dev_task"]);
const DEV_TASK_STATUSES = new Set(["reviewing", "done", "cancelled"]);
const DEV_TASK_CURRENT_NODES = new Set([
  "requirement_analysis",
  "technical_design",
  "task_breakdown",
  "dispatch",
  "implementation",
  "review",
  "archive"
]);
const DEV_TASK_REVIEW_STATUSES = new Set([
  "passed",
  "failed",
  "needs_followup",
  "design_conflict",
  "requirement_conflict",
  "task_breakdown"
]);
const REQUIREMENT_STATUSES = new Set(["drafting", "planning", "delivering", "delivered", "deferred", "cancelled"]);
const COMMAND_PATTERN = /^[a-z][a-z0-9-]*$/;
const MAX_ANCHOR_DISPATCH_PAYLOAD_BYTES = 64 * 1024;
const MAX_ANCHOR_DISPATCH_PAYLOAD_DEPTH = 8;

function schemaPath(schemaName) {
  const cleanName = schemaName.replace(/\.schema\.yaml$|\.yaml$/g, "");
  return join(schemaDir, `${cleanName}.schema.yaml`);
}

async function readRuntimeSchema(schemaName) {
  const path = schemaPath(schemaName);
  try {
    const text = await readFile(path, "utf8");
    const kind = text.match(/^kind:\s*([a-zA-Z0-9_-]+)\s*$/m)?.[1];
    if (!kind) {
      throw new ValidationError(`runtime schema missing kind: ${schemaName}`, { schemaName });
    }
    return { kind, path };
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new IOError(`failed to read runtime schema: ${schemaName}`, { path, cause: error });
  }
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function parseFrontmatter(content) {
  const matched = String(content).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!matched) return null;
  const result = {};
  for (const line of matched[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }
  return result;
}

function validateRequirementFrontmatter(content) {
  const issues = [];
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter) {
    issues.push("markdown must start with YAML frontmatter");
    return issues;
  }

  if (!/^[a-f0-9]{64}$/.test(frontmatter.analysis_input_hash ?? "")) {
    issues.push("analysis_input_hash must be a 64-character lowercase sha256 hex string");
  }
  if (!isIsoDate(frontmatter.analysis_applied_at)) {
    issues.push("analysis_applied_at must be an ISO8601 datetime string");
  }
  if (frontmatter.status !== undefined) {
    requireEnum(frontmatter.status, REQUIREMENT_STATUSES, "status", issues);
  }
  return issues;
}

function assertObject(value, path, issues) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    issues.push(`${path} must be an object`);
    return false;
  }
  return true;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function payloadDepth(value) {
  if (!value || typeof value !== "object") return 0;
  const children = Array.isArray(value) ? value : Object.values(value);
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map((child) => payloadDepth(child)));
}

function hasBase64BusinessField(value) {
  if (Array.isArray(value)) return value.some((item) => hasBase64BusinessField(item));
  if (!isPlainObject(value)) return false;
  return Object.entries(value).some(([key, nested]) => key.endsWith("_b64") || hasBase64BusinessField(nested));
}

function requireString(value, path, issues) {
  if (!isNonEmptyString(value)) issues.push(`${path} must be a non-empty string`);
}

function requireIso(value, path, issues) {
  if (!isIsoDate(value)) issues.push(`${path} must be an ISO8601 datetime string`);
}

function requireEnum(value, allowed, path, issues) {
  if (typeof value !== "string" || !allowed.has(value)) {
    issues.push(`${path} must be one of: ${[...allowed].join(", ")}`);
  }
}

function validateBreakdownDraftObject(draft) {
  const issues = [];
  if (!assertObject(draft, "draft", issues)) return issues;

  if (draft.schema_version !== "breakdown-draft-v0.2") {
    issues.push("schema_version must be breakdown-draft-v0.2");
  }
  requireEnum(draft.status, BREAKDOWN_STATUSES, "status", issues);
  for (const key of ["requirement_id", "carrier_task_id", "carrier_task_key"]) {
    requireString(draft[key], key, issues);
  }
  if (draft.project_id !== undefined) {
    requireString(draft.project_id, "project_id", issues);
  }
  if (draft.base_task_revision !== null && draft.base_task_revision !== undefined) {
    if (!Number.isInteger(draft.base_task_revision) || draft.base_task_revision < 0) {
      issues.push("base_task_revision must be a non-negative integer or null");
    }
  }
  requireIso(draft.generated_at, "generated_at", issues);
  requireIso(draft.updated_at, "updated_at", issues);
  requireEnum(draft.generated_by, GENERATED_BY, "generated_by", issues);

  if (assertObject(draft.generation_source, "generation_source", issues)) {
    for (const key of Object.keys(draft.generation_source)) {
      if (!GENERATION_SOURCE_KEYS.has(key)) {
        issues.push(`generation_source.${key} must be one of: ${[...GENERATION_SOURCE_KEYS].join(", ")}`);
      }
    }
    for (const key of GENERATION_SOURCE_KEYS) {
      if (draft.generation_source[key] !== undefined) requireString(draft.generation_source[key], `generation_source.${key}`, issues);
    }
  }

  if (assertObject(draft.plan, "plan", issues)) {
    for (const key of ["title", "summary", "spec_outline_md"]) {
      requireString(draft.plan[key], `plan.${key}`, issues);
    }
    if (draft.plan.estimated_total_days !== undefined && draft.plan.estimated_total_days !== null) {
      if (!isNumber(draft.plan.estimated_total_days) || draft.plan.estimated_total_days <= 0) {
        issues.push("plan.estimated_total_days must be a positive number or null");
      }
    }
  }

  if (!Array.isArray(draft.subtasks) || draft.subtasks.length === 0) {
    issues.push("subtasks must be a non-empty array");
  } else {
    const sectionIds = new Set();
    for (const [index, subtask] of draft.subtasks.entries()) {
      const path = `subtasks[${index}]`;
      if (!assertObject(subtask, path, issues)) continue;
      requireString(subtask.section_id, `${path}.section_id`, issues);
      if (sectionIds.has(subtask.section_id)) issues.push(`${path}.section_id duplicates ${subtask.section_id}`);
      sectionIds.add(subtask.section_id);
      if (!Number.isInteger(subtask.order) || subtask.order <= 0) issues.push(`${path}.order must be a positive integer`);
      for (const key of ["title", "summary", "spec_section_md"]) {
        requireString(subtask[key], `${path}.${key}`, issues);
      }
      requireEnum(subtask.priority, PRIORITIES, `${path}.priority`, issues);
      requireEnum(subtask.implementation_owner, OWNERS, `${path}.implementation_owner`, issues);
      if (!Array.isArray(subtask.dependencies)) {
        issues.push(`${path}.dependencies must be an array`);
      }
      if (typeof subtask.include !== "boolean") issues.push(`${path}.include must be boolean`);
    }

    for (const [index, subtask] of draft.subtasks.entries()) {
      if (!Array.isArray(subtask?.dependencies)) continue;
      for (const dependency of subtask.dependencies) {
        if (!sectionIds.has(dependency)) issues.push(`subtasks[${index}].dependencies references unknown section ${dependency}`);
      }
    }
  }

  if (draft.review_history !== undefined && !Array.isArray(draft.review_history)) {
    issues.push("review_history must be an array");
  } else if (Array.isArray(draft.review_history)) {
    for (const [index, entry] of draft.review_history.entries()) {
      const path = `review_history[${index}]`;
      if (!assertObject(entry, path, issues)) continue;
      requireIso(entry.at, `${path}.at`, issues);
      requireEnum(entry.actor, REVIEW_ACTORS, `${path}.actor`, issues);
      requireEnum(entry.action, REVIEW_ACTIONS, `${path}.action`, issues);
      if (entry.note !== undefined) requireString(entry.note, `${path}.note`, issues);
    }
  }

  if (draft.status === "approved") {
    if (!draft.approved_at) issues.push("approved draft must include approved_at");
    if (!draft.approved_by) issues.push("approved draft must include approved_by");
  }
  if (draft.approved_at !== undefined) requireIso(draft.approved_at, "approved_at", issues);
  if (draft.approved_by !== undefined) requireString(draft.approved_by, "approved_by", issues);
  if (draft.status === "consumed") {
    if (!draft.consumed_at) issues.push("consumed draft must include consumed_at");
    if (!draft.consumed_by) issues.push("consumed draft must include consumed_by");
    if (!draft.consumed_from_hash) issues.push("consumed draft must include consumed_from_hash");
  }
  if (draft.consumed_at !== undefined) requireIso(draft.consumed_at, "consumed_at", issues);
  if (draft.consumed_by !== undefined) requireString(draft.consumed_by, "consumed_by", issues);
  if (draft.consumed_from_hash !== undefined && !/^[a-f0-9]{64}$/.test(draft.consumed_from_hash)) {
    issues.push("consumed_from_hash must be a 64-character lowercase sha256 hex string");
  }

  return issues;
}

function validateBreakdownDraft(content) {
  try {
    return validateBreakdownDraftObject(typeof content === "string" ? JSON.parse(content) : content);
  } catch (error) {
    return [`breakdown draft must be valid JSON: ${error instanceof Error ? error.message : String(error)}`];
  }
}

function parseNumberText(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string" || !/^-?\d+$/.test(value.trim())) return Number.NaN;
  return Number.parseInt(value, 10);
}

function validateDevTask(content) {
  const issues = [];
  const frontmatter = parseFrontmatter(content);
  if (!frontmatter) {
    issues.push("markdown must start with YAML frontmatter");
    return issues;
  }

  requireEnum(frontmatter.doc_type, DEV_TASK_DOC_TYPES, "doc_type", issues);
  for (const key of ["task_id", "title", "node_substate", "requirement_id", "section_id", "source_breakdown_draft"]) {
    if (!isNonEmptyString(frontmatter[key])) issues.push(`${key} must be a non-empty string`);
  }
  requireEnum(frontmatter.status, DEV_TASK_STATUSES, "status", issues);
  requireEnum(frontmatter.current_node, DEV_TASK_CURRENT_NODES, "current_node", issues);
  if (frontmatter.review_status !== undefined) {
    requireEnum(frontmatter.review_status, DEV_TASK_REVIEW_STATUSES, "review_status", issues);
  }
  requireEnum(frontmatter.priority, PRIORITIES, "priority", issues);
  requireEnum(frontmatter.implementation_owner, OWNERS, "implementation_owner", issues);
  const order = parseNumberText(frontmatter.order);
  if (!Number.isInteger(order) || order <= 0) issues.push("order must be a positive integer");
  if (!/^[a-f0-9]{64}$/.test(frontmatter.source_draft_hash ?? "")) {
    issues.push("source_draft_hash must be a 64-character lowercase sha256 hex string");
  }
  if (!isIsoDate(frontmatter.created_at)) {
    issues.push("created_at must be an ISO8601 datetime string");
  }

  const body = String(content).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  if (!hasUsefulMarkdown(body)) {
    issues.push("body must contain useful markdown >= 50 chars with ## heading or list marker");
  }

  return issues;
}

function validateAnchorDispatch(content) {
  const issues = [];
  let envelope;
  try {
    envelope = typeof content === "string" ? JSON.parse(content) : content;
  } catch (error) {
    return [`anchor dispatch must be valid JSON: ${error instanceof Error ? error.message : String(error)}`];
  }

  if (!assertObject(envelope, "anchor_dispatch", issues)) return issues;
  if (typeof envelope.command !== "string" || !COMMAND_PATTERN.test(envelope.command)) {
    issues.push("command must be a /ccb skill name without prefix");
  }
  if (assertObject(envelope.payload, "payload", issues)) {
    const bytes = Buffer.byteLength(JSON.stringify(envelope.payload), "utf8");
    if (bytes > MAX_ANCHOR_DISPATCH_PAYLOAD_BYTES) {
      issues.push(`payload exceeds ${MAX_ANCHOR_DISPATCH_PAYLOAD_BYTES} bytes`);
    }
    const depth = payloadDepth(envelope.payload);
    if (depth > MAX_ANCHOR_DISPATCH_PAYLOAD_DEPTH) {
      issues.push(`payload depth exceeds ${MAX_ANCHOR_DISPATCH_PAYLOAD_DEPTH}`);
    }
    if (hasBase64BusinessField(envelope.payload)) {
      issues.push("payload must not contain *_b64 business fields");
    }
  }
  return issues;
}

export async function validateAgainstSchema(content, schemaName) {
  const schema = await readRuntimeSchema(schemaName);
  const issues =
    schema.kind === "markdown_frontmatter"
      ? validateRequirementFrontmatter(content)
      : schema.kind === "breakdown_draft_json"
        ? validateBreakdownDraft(content)
        : schema.kind === "dev_task_markdown"
          ? validateDevTask(content)
          : schema.kind === "anchor_dispatch_json"
            ? validateAnchorDispatch(content)
            : [`unsupported runtime schema kind: ${schema.kind}`];

  if (issues.length > 0) {
    throw new ValidationError(`schema validation failed for ${schemaName}: ${issues.join("; ")}`, {
      schemaName,
      issues
    });
  }

  return { valid: true, schemaName, schemaPath: schema.path };
}
