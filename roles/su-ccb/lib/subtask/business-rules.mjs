import { hasUsefulMarkdown, isIsoDate, isPlainObject, issue } from "../business-rules-utils.mjs";
import { ValidationError } from "../runtime/index.mjs";
import { validateDevTask } from "./generated-validator.mjs";

const TASK_ID_PATTERN = /^subtask-[a-f0-9]{12}$/;
const SECTION_ID_PATTERN = /^pr(\d+)-[a-z0-9-]+$/;
const ALLOWED_OWNERS = new Set(["claude", "ccb_codex"]);
const ALLOWED_PRIORITIES = new Set(["high", "medium", "low"]);
const ALLOWED_STATUSES = new Set(["reviewing", "done", "cancelled"]);
const ALLOWED_CURRENT_NODES = new Set([
  "requirement_analysis",
  "technical_design",
  "task_breakdown",
  "dispatch",
  "implementation",
  "review",
  "archive"
]);

function parseInteger(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) return Number.parseInt(value, 10);
  return Number.NaN;
}

function normalizeDependencies(value) {
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

function sectionNumber(sectionId) {
  const matched = typeof sectionId === "string" ? sectionId.match(SECTION_ID_PATTERN) : null;
  return matched ? Number.parseInt(matched[1], 10) : null;
}

export function validateDevTaskBusinessRules(frontmatter, markdownBody, options = {}) {
  const issues = [];
  if (isPlainObject(frontmatter)) {
    const generated = validateDevTask({
      frontmatter: {
        ...frontmatter,
        order: parseInteger(frontmatter.order),
        dependencies: normalizeDependencies(frontmatter.dependencies)
      },
      body: markdownBody
    });
    if (!generated.ok) {
      issues.push(...generated.issues.map((entry) => issue(entry.path, entry.actual, entry.expected)));
    }
  }
  if (!isPlainObject(frontmatter)) {
    issues.push(issue("frontmatter", frontmatter, "object"));
  } else {
    if (frontmatter.doc_type !== "dev_task") {
      issues.push(issue("doc_type", frontmatter.doc_type, "dev_task"));
    }
    if (!TASK_ID_PATTERN.test(frontmatter.task_id ?? "")) {
      issues.push(issue("task_id", frontmatter.task_id, "format subtask-<12-hex>"));
    }
    for (const key of ["title", "status", "current_node", "node_substate", "priority", "requirement_id", "section_id", "implementation_owner", "source_breakdown_draft", "source_draft_hash", "created_at"]) {
      if (typeof frontmatter[key] !== "string" || frontmatter[key].trim().length === 0) {
        issues.push(issue(key, frontmatter[key], "non-empty string"));
      }
    }
    if (!ALLOWED_STATUSES.has(frontmatter.status)) {
      issues.push(issue("status", frontmatter.status, "one of: reviewing, done, cancelled"));
    }
    if (!ALLOWED_CURRENT_NODES.has(frontmatter.current_node)) {
      issues.push(issue("current_node", frontmatter.current_node, "kernel task node"));
    }
    if (!ALLOWED_PRIORITIES.has(frontmatter.priority)) {
      issues.push(issue("priority", frontmatter.priority, "one of: high, medium, low"));
    }
    if (!ALLOWED_OWNERS.has(frontmatter.implementation_owner)) {
      issues.push(issue("implementation_owner", frontmatter.implementation_owner, "one of: claude, ccb_codex"));
    }

    const order = parseInteger(frontmatter.order);
    if (!Number.isInteger(order) || order <= 0) {
      issues.push(issue("order", frontmatter.order, "positive integer"));
    }
    const number = sectionNumber(frontmatter.section_id);
    if (number === null) {
      issues.push(issue("section_id", frontmatter.section_id, "format ^pr\\d+-[a-z0-9-]+$"));
    } else if (Number.isInteger(order) && order > 0 && number !== order) {
      issues.push(issue("section_id", frontmatter.section_id, `section_id prefix pr${order}-`));
    }

    if (!/^[a-f0-9]{64}$/.test(frontmatter.source_draft_hash ?? "")) {
      issues.push(issue("source_draft_hash", frontmatter.source_draft_hash, "64-character lowercase sha256 hex"));
    }
    if (!isIsoDate(frontmatter.created_at)) {
      issues.push(issue("created_at", frontmatter.created_at, "strict ISO8601 datetime"));
    }

    const knownTaskIds = options.knownTaskIds instanceof Set ? options.knownTaskIds : new Set();
    for (const [index, dependency] of normalizeDependencies(frontmatter.dependencies).entries()) {
      if (!knownTaskIds.has(dependency)) {
        issues.push(issue(`dependencies[${index}]`, dependency, "existing task_id in this materialization batch"));
      }
    }
  }

  if (!hasUsefulMarkdown(markdownBody)) {
    issues.push(issue("body", markdownBody, "markdown >= 50 chars with ## heading or list marker"));
  }

  if (issues.length > 0) {
    throw new ValidationError(
      `dev_task business rules failed: ${issues.map((entry) => entry.message).join("; ")}`,
      { issues }
    );
  }
}
