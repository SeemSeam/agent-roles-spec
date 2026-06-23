import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";

import {
  ConflictError,
  ValidationError,
  appendEvent,
  hashContent,
  safeWriteFile,
  validateAgainstSchema,
  withFileLock
} from "../runtime/index.mjs";
import {
  assertNoForbiddenDraftPatchFields,
  validateBreakdownDraftBusinessRules
} from "./business-rules.mjs";

const DRAFT_SCHEMA_NAME = "breakdown-draft";
const SOURCE_ACTOR = "ccb_claude";

function safeDraftFileName(id) {
  return `${String(id).replace(/[\\/]/g, "_")}.json`;
}

function draftPath(projectRoot, requirementId) {
  return join(projectRoot, "docs", ".ccb", "drafts", "breakdown", safeDraftFileName(requirementId));
}

function sortCanonical(value) {
  if (Array.isArray(value)) return value.map((item) => sortCanonical(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortCanonical(nested)])
    );
  }
  return value;
}

function canonicalJson(value) {
  return JSON.stringify(sortCanonical(value));
}

function hashDraft(draft) {
  return hashContent(canonicalJson(draft));
}

function serializeDraft(draft) {
  return `${JSON.stringify(draft, null, 2)}\n`;
}

function withoutDeprecatedProjectId(draft) {
  const next = { ...draft };
  delete next.project_id;
  return next;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function slugifySection(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function mergePatch(base, patch) {
  if (!isPlainObject(patch)) {
    throw new ValidationError("breakdown draft patch must be an object", {
      issues: ["patch must be an object"]
    });
  }

  const next = { ...base };
  for (const [key, value] of Object.entries(patch)) {
    if (isPlainObject(value) && isPlainObject(base[key])) {
      next[key] = mergePatch(base[key], value);
    } else {
      next[key] = value;
    }
  }
  return next;
}

function reviewEntry({ at, actor = "user", action, note }) {
  return note ? { at, actor, action, note } : { at, actor, action };
}

function feedbackToReviewNote(feedback) {
  if (typeof feedback === "string") return feedback.trim();
  if (isPlainObject(feedback)) {
    const parts = [];
    if (typeof feedback.summary === "string" && feedback.summary.trim()) {
      parts.push(feedback.summary.trim());
    }
    if (Array.isArray(feedback.items)) {
      for (const item of feedback.items) {
        if (typeof item === "string" && item.trim()) parts.push(`- ${item.trim()}`);
      }
    }
    if (parts.length > 0) return parts.join("\n");
    return JSON.stringify(feedback);
  }
  return "";
}

function requireNonEmptyString(value, path, issues) {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${path} must be a non-empty string`);
  }
}

function normalizeDeriveFollowupInput({ followup, sourceTask }) {
  const issues = [];
  if (!isPlainObject(followup)) {
    issues.push("followup must be an object");
  } else {
    if (!["subtask", "requirement"].includes(followup.type)) {
      issues.push("followup.type must be one of: subtask, requirement");
    }
    requireNonEmptyString(followup.title, "followup.title", issues);
    if (followup.description !== undefined && typeof followup.description !== "string") {
      issues.push("followup.description must be a string when present");
    }
  }

  if (!isPlainObject(sourceTask)) {
    issues.push("sourceTask must be an object");
  } else {
    requireNonEmptyString(sourceTask.id, "sourceTask.id", issues);
    requireNonEmptyString(sourceTask.key, "sourceTask.key", issues);
    if (sourceTask.title !== undefined && typeof sourceTask.title !== "string") {
      issues.push("sourceTask.title must be a string when present");
    }
    if (sourceTask.currentNode !== undefined && typeof sourceTask.currentNode !== "string") {
      issues.push("sourceTask.currentNode must be a string when present");
    }
  }

  if (issues.length > 0) {
    throw new ValidationError("derive_followup payload is invalid", { issues });
  }

  return {
    followup: {
      type: followup.type,
      title: followup.title.trim(),
      description: typeof followup.description === "string" ? followup.description.trim() : ""
    },
    sourceTask: {
      id: sourceTask.id.trim(),
      key: sourceTask.key.trim(),
      title: typeof sourceTask.title === "string" ? sourceTask.title.trim() : "",
      currentNode: typeof sourceTask.currentNode === "string" ? sourceTask.currentNode.trim() : ""
    }
  };
}

function derivedFollowupSpecSection({ followup, sourceTask }) {
  return [
    `## ${followup.title}`,
    "",
    `> 派生自:task ${sourceTask.id}(${sourceTask.key})`,
    "",
    "### Follow-up",
    "",
    `- Type: ${followup.type}`,
    followup.description
      ? `- Description: ${followup.description}`
      : "- Description: implement the requested follow-up from the source task.",
    sourceTask.title ? `- Source task title: ${sourceTask.title}` : "- Source task title: not provided",
    sourceTask.currentNode ? `- Source task current node: ${sourceTask.currentNode}` : "- Source task current node: not provided",
    "",
    "### Acceptance",
    "",
    "- Deliver the follow-up without changing unrelated requirement scope.",
    "- Keep the source task provenance visible in the implementation receipt."
  ].join("\n");
}

function deriveFollowupSubtask(draft, normalized) {
  const order = Math.max(0, ...draft.subtasks.map((subtask) => Number(subtask.order) || 0)) + 1;
  const slug = slugifySection(normalized.followup.title) || "followup";
  return {
    section_id: `pr${order}-${slug}`,
    order,
    title: normalized.followup.title,
    summary: normalized.followup.description || `Follow-up derived from ${normalized.sourceTask.key}.`,
    spec_section_md: derivedFollowupSpecSection(normalized),
    priority: "high",
    implementation_owner: "ccb_codex",
    dependencies: [],
    include: true
  };
}

async function appendDraftEvent({ projectRoot, requirementId, type, draft, hash, path, payload = {}, idempotencySuffix }) {
  return await appendEvent(
    {
      type,
      subject_type: "requirement",
      subject_id: requirementId,
      payload: {
        requirement_id: requirementId,
        path,
        hash,
        status: draft?.status ?? null,
        ...payload
      },
      idempotency_key: `breakdown-draft:${requirementId}:${type}:${idempotencySuffix ?? hash ?? "none"}`,
      emitted_at: new Date().toISOString(),
      source_actor: SOURCE_ACTOR
    },
    { projectRoot }
  );
}

async function parseDraftFile(path) {
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(`breakdown draft not found: ${path}`);
    }
    throw error;
  }
  const draft = JSON.parse(content);
  await validateAgainstSchema(content, DRAFT_SCHEMA_NAME);
  return {
    draft,
    hash: hashDraft(draft),
    fileHash: hashContent(content),
    path
  };
}

async function writeValidatedDraft(path, draft, expectedFileHash, audit = false) {
  const content = serializeDraft(draft);
  validateBreakdownDraftBusinessRules(draft);
  await validateAgainstSchema(content, DRAFT_SCHEMA_NAME);
  return await safeWriteFile(path, content, {
    expectedHash: expectedFileHash,
    schemaName: DRAFT_SCHEMA_NAME,
    audit
  });
}

export async function readBreakdownDraft({ projectRoot, requirementId }) {
  return await parseDraftFile(draftPath(projectRoot, requirementId));
}

export async function createBreakdownDraft({ projectRoot, requirementId, draftPayload, lockOptions = {} }) {
  const path = draftPath(projectRoot, requirementId);
  return await withFileLock(
    path,
    async () => {
      const draft = withoutDeprecatedProjectId({
        ...draftPayload,
        requirement_id: requirementId,
        carrier_task_id: draftPayload.carrier_task_id ?? requirementId,
        review_history: draftPayload.review_history ?? [
          reviewEntry({ at: new Date().toISOString(), actor: "ai", action: "created" })
        ]
      });
      const hash = hashDraft(draft);
      const writeResult = await writeValidatedDraft(path, draft, null, {
        projectRoot,
        subjectType: "requirement",
        subjectId: requirementId,
        sourceActor: SOURCE_ACTOR,
        resourceType: "breakdown_draft",
        operation: "createBreakdownDraft",
        runId: `breakdown-draft:${requirementId}:create:${hash}`,
        plannedDiff: { status: draft.status, hash }
      });
      await appendDraftEvent({
        projectRoot,
        requirementId,
        type: "breakdown_draft_created",
        draft,
        hash,
        path,
        payload: { file_hash: writeResult.hash }
      });
      return { path, draft, hash, fileHash: writeResult.hash };
    },
    lockOptions
  );
}

export async function updateBreakdownDraft({ projectRoot, requirementId, patch, expectedHash, lockOptions = {} }) {
  const path = draftPath(projectRoot, requirementId);
  return await withFileLock(
    path,
    async () => {
      const current = await parseDraftFile(path);
      if (expectedHash && current.hash !== expectedHash) {
        throw new ConflictError("breakdown draft hash mismatch", {
          path,
          expectedHash,
          actualHash: current.hash
        });
      }
      assertNoForbiddenDraftPatchFields(patch);
      const now = new Date().toISOString();
      const draft = withoutDeprecatedProjectId({
        ...mergePatch(current.draft, patch),
        updated_at: now,
        review_history: [
          ...(current.draft.review_history ?? []),
          reviewEntry({ at: now, actor: "ai", action: "edited" })
        ]
      });
      const hash = hashDraft(draft);
      const writeResult = await writeValidatedDraft(path, draft, current.fileHash, {
        projectRoot,
        subjectType: "requirement",
        subjectId: requirementId,
        sourceActor: SOURCE_ACTOR,
        resourceType: "breakdown_draft",
        operation: "updateBreakdownDraft",
        runId: `breakdown-draft:${requirementId}:update:${hash}`,
        plannedDiff: patch
      });
      await appendDraftEvent({
        projectRoot,
        requirementId,
        type: "breakdown_draft_updated",
        draft,
        hash,
        path,
        payload: { previous_hash: current.hash, file_hash: writeResult.hash }
      });
      return { path, draft, hash, fileHash: writeResult.hash };
    },
    lockOptions
  );
}

export async function deriveFollowupBreakdownDraft({
  projectRoot,
  requirementId,
  followup,
  sourceTask,
  expectedHash,
  approvedBy = SOURCE_ACTOR,
  lockOptions = {}
}) {
  const normalized = normalizeDeriveFollowupInput({ followup, sourceTask });
  let current = await readBreakdownDraft({ projectRoot, requirementId });
  if (expectedHash && current.hash !== expectedHash) {
    throw new ConflictError("breakdown draft hash mismatch", {
      path: current.path,
      expectedHash,
      actualHash: current.hash
    });
  }

  if (current.draft.status === "consumed") {
    current = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId,
      expectedHash: current.hash,
      fromStatus: "consumed",
      toStatus: "draft",
      reviewerNote: "derive_followup reopened consumed breakdown draft",
      lockOptions
    });
  }

  const subtask = deriveFollowupSubtask(current.draft, normalized);
  const updated = await updateBreakdownDraft({
    projectRoot,
    requirementId,
    expectedHash: current.hash,
    patch: {
      subtasks: [...current.draft.subtasks, subtask]
    },
    lockOptions
  });

  let approved = updated;
  if (updated.draft.status === "draft") {
    const reviewing = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId,
      expectedHash: updated.hash,
      fromStatus: "draft",
      toStatus: "reviewing",
      reviewerNote: "derive_followup appended a new follow-up subtask",
      lockOptions
    });
    approved = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId,
      expectedHash: reviewing.hash,
      fromStatus: "reviewing",
      toStatus: "approved",
      reviewerNote: "derive_followup approved for materialization",
      approvedBy,
      lockOptions
    });
  } else if (updated.draft.status === "reviewing") {
    approved = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId,
      expectedHash: updated.hash,
      fromStatus: "reviewing",
      toStatus: "approved",
      reviewerNote: "derive_followup approved for materialization",
      approvedBy,
      lockOptions
    });
  } else if (updated.draft.status !== "approved") {
    throw new ValidationError("derive_followup requires draft, reviewing, approved, or consumed breakdown draft", {
      issues: [`status must be draft, reviewing, approved, or consumed, got ${updated.draft.status}`]
    });
  }

  return {
    path: approved.path,
    draft: approved.draft,
    hash: approved.hash,
    fileHash: approved.fileHash,
    appendedSubtask: subtask,
    materializeExpectedHash: approved.hash
  };
}

function transitionAction(fromStatus, toStatus, feedback) {
  if (fromStatus === "draft" && toStatus === "reviewing") return "begin_review";
  if (fromStatus === "reviewing" && toStatus === "approved") return "approve";
  if (fromStatus === "reviewing" && toStatus === "draft" && feedback) return "reject";
  if (fromStatus === "approved" && toStatus === "consumed") return "consume";
  if (fromStatus === "consumed" && toStatus === "draft") return "reopen";
  return null;
}

function assertAllowedTransition({ currentStatus, fromStatus, toStatus, feedback }) {
  if (fromStatus && currentStatus !== fromStatus) {
    throw new ConflictError("breakdown draft status mismatch", {
      expectedHash: fromStatus,
      actualHash: currentStatus
    });
  }
  if (!transitionAction(currentStatus, toStatus, feedback)) {
    throw new ValidationError(`invalid breakdown draft transition: ${currentStatus} -> ${toStatus}`, {
      issues: [`${currentStatus} -> ${toStatus} is not allowed`]
    });
  }
}

function eventTypeForTransition(action) {
  return {
    begin_review: "breakdown_draft_begin_review",
    approve: "breakdown_draft_approved",
    reject: "breakdown_draft_rejected",
    consume: "breakdown_draft_consumed",
    reopen: "breakdown_draft_reopened"
  }[action];
}

export async function transitionBreakdownDraftStatus({
  projectRoot,
  requirementId,
  expectedHash,
  fromStatus,
  toStatus,
  reviewerNote,
  feedback,
  approvedBy,
  lockOptions = {}
}) {
  const path = draftPath(projectRoot, requirementId);
  return await withFileLock(
    path,
    async () => {
      const current = await parseDraftFile(path);
      if (!expectedHash) {
        throw new ValidationError("expectedHash is required for breakdown draft status transitions", {
          issues: ["expectedHash is required"]
        });
      }
      if (current.hash !== expectedHash) {
        throw new ConflictError("breakdown draft hash mismatch", {
          path,
          expectedHash,
          actualHash: current.hash
        });
      }
      assertAllowedTransition({
        currentStatus: current.draft.status,
        fromStatus,
        toStatus,
        feedback
      });
      const action = transitionAction(current.draft.status, toStatus, feedback);
      const now = new Date().toISOString();
      const note = feedback === undefined ? reviewerNote : feedbackToReviewNote(feedback);
      const draft = withoutDeprecatedProjectId({
        ...current.draft,
        status: toStatus,
        updated_at: now,
        review_history: [
          ...(current.draft.review_history ?? []),
          reviewEntry({
            at: now,
            actor: "user",
            action: action === "reject" ? "rejected" : "status_changed",
            note
          })
        ]
      });
      if (toStatus === "approved") {
        draft.approved_at = now;
        draft.approved_by = approvedBy ?? "user";
      }
      if (toStatus === "consumed") {
        draft.consumed_at = now;
        draft.consumed_by = approvedBy ?? "ccb_claude";
        draft.consumed_from_hash = current.hash;
      }
      const hash = hashDraft(draft);
      const writeResult = await writeValidatedDraft(path, draft, current.fileHash, {
        projectRoot,
        subjectType: "requirement",
        subjectId: requirementId,
        sourceActor: SOURCE_ACTOR,
        resourceType: "breakdown_draft",
        operation: "transitionBreakdownDraftStatus",
        runId: `breakdown-draft:${requirementId}:transition:${hash}`,
        plannedDiff: {
          from_status: current.draft.status,
          to_status: toStatus
        }
      });
      await appendDraftEvent({
        projectRoot,
        requirementId,
        type: eventTypeForTransition(action),
        draft,
        hash,
        path,
        payload: {
          previous_hash: current.hash,
          from_status: current.draft.status,
          to_status: toStatus,
          feedback: feedback ?? null,
          reviewer_note: reviewerNote ?? null,
          file_hash: writeResult.hash
        }
      });
      return { path, draft, hash, fileHash: writeResult.hash };
    },
    lockOptions
  );
}

export async function deleteBreakdownDraft({ projectRoot, requirementId, lockOptions = {} }) {
  const path = draftPath(projectRoot, requirementId);
  return await withFileLock(
    path,
    async () => {
      const current = await parseDraftFile(path);
      await appendDraftEvent({
        projectRoot,
        requirementId,
        type: "breakdown_draft_deleted",
        draft: current.draft,
        hash: current.hash,
        path,
        idempotencySuffix: current.hash
      });
      await rm(path);
      return { path, deleted: true, hash: current.hash };
    },
    lockOptions
  );
}
