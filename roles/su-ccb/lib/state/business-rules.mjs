import { issue } from "../business-rules-utils.mjs";
import { ValidationError } from "../runtime/index.mjs";

const STATUSES = new Set(["reviewing", "done", "cancelled"]);
const CURRENT_NODES = new Set([
  "requirement_analysis",
  "technical_design",
  "task_breakdown",
  "dispatch",
  "implementation",
  "review",
  "archive"
]);
const REVIEW_STATUSES = new Set([
  "passed",
  "failed",
  "needs_followup",
  "design_conflict",
  "requirement_conflict",
  "task_breakdown"
]);

function requireEnum(value, allowed, path, issues) {
  if (!allowed.has(value)) {
    issues.push(issue(path, value, `one of: ${Array.from(allowed).join(", ")}`));
  }
}

export function validateTaskStateBusinessRules(frontmatter) {
  const issues = [];
  if (!frontmatter || typeof frontmatter !== "object" || Array.isArray(frontmatter)) {
    issues.push(issue("frontmatter", frontmatter, "object"));
  } else {
    if (frontmatter.doc_type !== "dev_task") {
      issues.push(issue("doc_type", frontmatter.doc_type, "dev_task"));
    }
    if (typeof frontmatter.task_id !== "string" || frontmatter.task_id.trim().length === 0) {
      issues.push(issue("task_id", frontmatter.task_id, "non-empty string"));
    }
    requireEnum(frontmatter.status, STATUSES, "status", issues);
    requireEnum(frontmatter.current_node, CURRENT_NODES, "current_node", issues);
    if (typeof frontmatter.node_substate !== "string" || frontmatter.node_substate.trim().length === 0) {
      issues.push(issue("node_substate", frontmatter.node_substate, "non-empty string"));
    }
    if (frontmatter.review_status !== undefined) {
      requireEnum(frontmatter.review_status, REVIEW_STATUSES, "review_status", issues);
    }
  }

  if (issues.length > 0) {
    throw new ValidationError(
      `dev_task state business rules failed: ${issues.map((entry) => entry.message).join("; ")}`,
      { issues }
    );
  }
}
