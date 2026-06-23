import { ValidationError } from "../runtime/index.mjs";
import { hasUsefulMarkdown, isPlainObject, issue } from "../business-rules-utils.mjs";
import { validateBreakdownDraft } from "./generated-validator.mjs";

export { issue } from "../business-rules-utils.mjs";

// Deprecated compatibility layer: generated-validator.mjs is the schema source.
// Keep cross-field checks here for Phase 4b; remove this hand-written layer in v1.x.
const SECTION_ID_PATTERN = /^pr(\d+)-[a-z0-9-]+$/;
const ALLOWED_OWNERS = new Set(["claude", "ccb_codex"]);
const FORBIDDEN_PATCH_FIELDS = [
  "status",
  "approved_at",
  "approved_by",
  "rejected_at",
  "rejected_by",
  "consumed_at",
  "cancelled_at"
];

function sectionNumber(sectionId) {
  const matched = typeof sectionId === "string" ? sectionId.match(SECTION_ID_PATTERN) : null;
  return matched ? Number.parseInt(matched[1], 10) : null;
}

function collectSubtaskBusinessIssues(draft, issues) {
  if (!Array.isArray(draft.subtasks)) return;

  const sectionIds = new Set();
  const orders = [];
  for (const [index, subtask] of draft.subtasks.entries()) {
    const path = `subtasks[${index}]`;
    if (!isPlainObject(subtask)) continue;

    const number = sectionNumber(subtask.section_id);
    if (number === null) {
      issues.push(issue(`${path}.section_id`, subtask.section_id, "format ^pr\\d+-[a-z0-9-]+$"));
    }
    if (sectionIds.has(subtask.section_id)) {
      issues.push(issue(`${path}.section_id`, subtask.section_id, "unique section_id within the draft"));
    }
    sectionIds.add(subtask.section_id);

    if (Number.isInteger(subtask.order)) {
      orders.push(subtask.order);
      if (number !== null && number !== subtask.order) {
        issues.push(issue(`${path}.section_id`, subtask.section_id, `section_id prefix pr${subtask.order}-`));
      }
    }

    if (!ALLOWED_OWNERS.has(subtask.implementation_owner)) {
      issues.push(issue(`${path}.implementation_owner`, subtask.implementation_owner, "one of: claude, ccb_codex"));
    }

    if (!hasUsefulMarkdown(subtask.spec_section_md)) {
      issues.push(issue(`${path}.spec_section_md`, subtask.spec_section_md, "markdown >= 50 chars with ## heading or list marker"));
    }
  }

  const sortedOrders = [...orders].sort((left, right) => left - right);
  for (let index = 0; index < draft.subtasks.length; index += 1) {
    const expected = index + 1;
    if (sortedOrders[index] !== expected) {
      issues.push(issue("subtasks.order", orders, "contiguous sequence starting at 1"));
      break;
    }
  }

  for (const [index, subtask] of draft.subtasks.entries()) {
    if (!Array.isArray(subtask?.dependencies)) continue;
    for (const [dependencyIndex, dependency] of subtask.dependencies.entries()) {
      if (!sectionIds.has(dependency)) {
        issues.push(issue(`subtasks[${index}].dependencies[${dependencyIndex}]`, dependency, "existing section_id in this draft"));
      }
    }
  }
}

export function validateBreakdownDraftBusinessRules(draft) {
  const issues = [];
  const generated = validateBreakdownDraft(draft);
  if (!generated.ok) {
    issues.push(
      ...generated.issues
        .filter((entry) => !(entry.path === "base_task_revision" && entry.actual === null && entry.expected === "required"))
        .map((entry) => issue(entry.path, entry.actual, entry.expected))
    );
  }
  if (!isPlainObject(draft)) {
    issues.push(issue("draft", draft, "object"));
  } else {
    if (!hasUsefulMarkdown(draft.plan?.spec_outline_md)) {
      issues.push(
        issue("plan.spec_outline_md", draft.plan?.spec_outline_md, "markdown >= 50 chars with ## heading or list marker")
      );
    }
    collectSubtaskBusinessIssues(draft, issues);
    if (draft.review_history !== undefined && !Array.isArray(draft.review_history)) {
      issues.push(issue("review_history", draft.review_history, "array when present"));
    }
  }

  if (issues.length > 0) {
    throw new ValidationError(
      `breakdown draft business rules failed: ${issues.map((entry) => entry.message).join("; ")}`,
      { issues }
    );
  }
}

export function assertNoForbiddenDraftPatchFields(patch) {
  if (!isPlainObject(patch)) return;
  const issues = FORBIDDEN_PATCH_FIELDS
    .filter((field) => Object.hasOwn(patch, field))
    .map((field) => issue(field, patch[field], "must be changed through transitionBreakdownDraftStatus"));

  if (issues.length > 0) {
    throw new ValidationError(
      `forbidden_field_patched: ${issues.map((entry) => entry.message).join("; ")}`,
      { issues }
    );
  }
}
