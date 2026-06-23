import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

import { applyCapabilityOutcome } from "../../capability-outcome/index.mjs";
import { createBreakdownDraft } from "../../breakdown-draft/index.mjs";
import { appendEvent, hashContent } from "../../runtime/index.mjs";
import { readTaskState, writeTaskState } from "../../state/index.mjs";
import {
  ensureRequirementWorktree,
  mergeRequirementWorktree,
  requirementWorktreeStatePath
} from "../../worktree/index.mjs";
import {
  cancelRequirement,
  cancelSubtask,
  listDevTasksByRequirement
} from "../index.mjs";

process.env.CCB_EVENT_HOOK_URLS = "";

const execFileAsync = promisify(execFile);

async function tempProject(prefix = "ccb-requirement-cancel") {
  const root = join(tmpdir(), `${prefix}-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  return root;
}

async function git(cwd, args) {
  const result = await execFileAsync("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });
  return (result.stdout ?? "").trim();
}

async function tempGitProject() {
  const baseDir = await tempProject("ccb-requirement-cancel-git");
  const projectRoot = join(baseDir, "repo");
  await mkdir(projectRoot, { recursive: true });
  await git(projectRoot, ["init", "-b", "main"]);
  await git(projectRoot, ["config", "user.email", "ccb-test@example.invalid"]);
  await git(projectRoot, ["config", "user.name", "CCB Test"]);
  await writeFile(join(projectRoot, "README.md"), "initial\n", "utf8");
  await writeFile(join(projectRoot, ".gitignore"), "/.ccb/\n", "utf8");
  await git(projectRoot, ["add", "README.md", ".gitignore"]);
  await git(projectRoot, ["commit", "-m", "initial"]);
  return { baseDir, projectRoot };
}

async function pathPresent(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

function requirementRelativePath(requirementId) {
  return `docs/02_需求设计/${requirementId}.md`;
}

async function writeRequirement(projectRoot, requirementId, status = "planning") {
  const relativePath = requirementRelativePath(requirementId);
  const path = join(projectRoot, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  const content = [
    "---",
    `id: ${requirementId}`,
    `title: ${requirementId}`,
    "doc_type: requirement",
    `status: ${status}`,
    "---",
    "",
    "# Requirement",
    "",
    "- Fixture requirement.",
    ""
  ].join("\n");
  await writeFile(path, content, "utf8");
  return { path, relativePath, content, hash: hashContent(content) };
}

async function readRequirementStatus(projectRoot, requirementId) {
  return (await readFile(join(projectRoot, requirementRelativePath(requirementId)), "utf8")).match(/^status:\s*(.+)$/m)?.[1];
}

async function writeDevTask(projectRoot, requirementId, taskId, overrides = {}) {
  const path = join(projectRoot, "docs", "03_开发计划", `${taskId}-开发任务.md`);
  await mkdir(join(path, ".."), { recursive: true });
  const status = overrides.status ?? "reviewing";
  await writeFile(path, [
    "---",
    "doc_type: dev_task",
    `task_id: ${taskId}`,
    `title: ${taskId}`,
    `status: ${status}`,
    `current_node: ${overrides.current_node ?? (status === "done" ? "archive" : "dispatch")}`,
    `node_substate: ${overrides.node_substate ?? (status === "done" ? "archived" : "awaiting_codex_pickup")}`,
    ...(overrides.review_status ? [`review_status: ${overrides.review_status}`] : []),
    "priority: medium",
    `requirement_id: ${requirementId}`,
    "section_id: pr1-cancel",
    "order: 1",
    "implementation_owner: ccb_codex",
    "dependencies: []",
    `source_breakdown_draft: docs/.ccb/drafts/breakdown/${requirementId}.json`,
    `source_draft_hash: ${"a".repeat(64)}`,
    "created_at: 2026-06-06T10:00:00.000Z",
    "---",
    "",
    "## Dev Task",
    "",
    "- Fixture dev task with enough markdown content for schema validation.",
    "- Cancellation tests mutate frontmatter while preserving this useful body.",
    ""
  ].join("\n"), "utf8");
  return path;
}

async function readEvents(projectRoot) {
  const path = join(projectRoot, "docs", ".ccb", "events", "journal.jsonl");
  const content = await readFile(path, "utf8").catch((error) => {
    if (error?.code === "ENOENT") return "";
    throw error;
  });
  return content.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function validDraft(requirementId) {
  return {
    schema_version: "breakdown-draft-v0.2",
    status: "draft",
    requirement_id: requirementId,
    carrier_task_id: requirementId,
    carrier_task_key: "Runtime Requirement",
    base_task_revision: null,
    generated_at: "2026-06-06T10:00:00.000Z",
    updated_at: "2026-06-06T10:00:00.000Z",
    generated_by: "ai_session",
    generation_source: {
      cc_agent: "ccb_claude",
      cx_agent: "ccb_codex"
    },
    plan: {
      title: "Cancel fixture plan",
      summary: "Plan summary",
      spec_outline_md: "## Outline\n\n- Exercise cancellation cleanup through the public library contract.",
      estimated_total_days: 1
    },
    subtasks: [
      {
        section_id: "pr1-cancel",
        order: 1,
        title: "Cancel fixture subtask",
        summary: "Exercise cancellation.",
        spec_section_md: "## Task\n\n- Exercise cancellation cleanup through capability outcome.",
        priority: "high",
        implementation_owner: "ccb_codex",
        dependencies: [],
        include: true
      }
    ],
    review_history: [
      {
        at: "2026-06-06T10:00:00.000Z",
        actor: "ai",
        action: "created"
      }
    ]
  };
}

async function appendUserCancelAuthorization(projectRoot, subjectRef, key) {
  await appendEvent(
    {
      type: "user_cancel_authorized",
      subject_type: subjectRef.subject_type,
      subject_id: subjectRef.subject_id,
      payload: {
        must_ask_ref: "must_ask_9",
        approved_by: "user",
        subject_ref: subjectRef
      },
      idempotency_key: key,
      emitted_at: "2026-06-06T10:00:00.000Z",
      source_actor: "ccb_claude"
    },
    { projectRoot }
  );
}

function cancelEvidence(relativePath, subjectRef, key) {
  return [
    {
      kind: "A",
      ref: `file:${relativePath}`,
      check_id: "file_exists",
      params: { path: relativePath }
    },
    {
      kind: "B",
      ref: key,
      check_id: "journal_event_exists",
      params: {
        idempotency_key: key,
        event_type: "user_cancel_authorized",
        must_ask_ref: "must_ask_9",
        approved_by: "user",
        subject_ref: subjectRef
      }
    }
  ];
}

async function applyRequirementLifecycle(projectRoot, requirementId, status, capabilityId, outcomeType) {
  const requirement = await writeRequirement(projectRoot, requirementId, status);
  const subjectRef = {
    subject_type: "requirement",
    subject_id: requirementId,
    canonical_path: requirement.relativePath,
    base_hash: requirement.hash
  };
  const authorizationKey = `auth:${requirementId}:${capabilityId}`;
  await appendUserCancelAuthorization(projectRoot, subjectRef, authorizationKey);
  return await applyCapabilityOutcome({
    projectRoot,
    capabilityId,
    outcomeType,
    subjectRef,
    expectedHash: requirement.hash,
    evidence: cancelEvidence(requirement.relativePath, subjectRef, authorizationKey),
    mustAskRefs: ["must_ask_9"]
  });
}

test("cancel/defer guards reject terminals and no-op repeated cancellation", async () => {
  const projectRoot = await tempProject();
  try {
    const cancelDelivered = await applyRequirementLifecycle(
      projectRoot,
      "req-cancel-delivered",
      "delivered",
      "requirement.cancel",
      "cancelled"
    );
    assert.equal(cancelDelivered.ok, false);
    assert.equal(cancelDelivered.code, "GUARD_FAILED");

    const cancelCancelled = await applyRequirementLifecycle(
      projectRoot,
      "req-cancel-cancelled",
      "cancelled",
      "requirement.cancel",
      "cancelled"
    );
    assert.equal(cancelCancelled.ok, true);
    assert.equal(cancelCancelled.noop, true);

    const deferDelivered = await applyRequirementLifecycle(
      projectRoot,
      "req-defer-delivered",
      "delivered",
      "requirement.defer",
      "deferred"
    );
    assert.equal(deferDelivered.ok, false);
    assert.equal(deferDelivered.code, "GUARD_FAILED");

    const deferCancelled = await applyRequirementLifecycle(
      projectRoot,
      "req-defer-cancelled",
      "cancelled",
      "requirement.defer",
      "deferred"
    );
    assert.equal(deferCancelled.ok, false);
    assert.equal(deferCancelled.code, "GUARD_FAILED");

    const deferDeferred = await applyRequirementLifecycle(
      projectRoot,
      "req-defer-deferred",
      "deferred",
      "requirement.defer",
      "deferred"
    );
    assert.equal(deferDeferred.ok, true);
    assert.equal(deferDeferred.noop, true);

    await writeDevTask(projectRoot, "req-subtask-guard", "subtask-done000001", {
      status: "done",
      review_status: "passed"
    });
    const doneTask = await readTaskState({ projectRoot, taskId: "subtask-done000001" });
    const doneSubject = {
      subject_type: "subtask",
      subject_id: "subtask-done000001",
      canonical_path: "docs/03_开发计划/subtask-done000001-开发任务.md",
      base_hash: doneTask.hash
    };
    await appendUserCancelAuthorization(projectRoot, doneSubject, "auth:subtask-done");
    const subtaskDone = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "subtask.cancel",
      outcomeType: "cancelled",
      subjectRef: doneSubject,
      expectedHash: doneTask.hash,
      evidence: cancelEvidence(doneSubject.canonical_path, doneSubject, "auth:subtask-done"),
      mustAskRefs: ["must_ask_9"]
    });
    assert.equal(subtaskDone.ok, false);
    assert.equal(subtaskDone.code, "GUARD_FAILED");

    await writeDevTask(projectRoot, "req-subtask-guard", "subtask-cancel0001", { status: "cancelled" });
    const cancelledTask = await readTaskState({ projectRoot, taskId: "subtask-cancel0001" });
    const cancelledSubject = {
      subject_type: "subtask",
      subject_id: "subtask-cancel0001",
      canonical_path: "docs/03_开发计划/subtask-cancel0001-开发任务.md",
      base_hash: cancelledTask.hash
    };
    await appendUserCancelAuthorization(projectRoot, cancelledSubject, "auth:subtask-cancelled");
    const subtaskCancelled = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "subtask.cancel",
      outcomeType: "cancelled",
      subjectRef: cancelledSubject,
      expectedHash: cancelledTask.hash,
      evidence: cancelEvidence(cancelledSubject.canonical_path, cancelledSubject, "auth:subtask-cancelled"),
      mustAskRefs: ["must_ask_9"]
    });
    assert.equal(subtaskCancelled.ok, true);
    assert.equal(subtaskCancelled.noop, true);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("cancelRequirement tombstones first, cascades active subtasks, deletes draft, skips missing worktree, and journals summary", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-cancel-happy";
  try {
    await writeRequirement(projectRoot, requirementId, "planning");
    await writeDevTask(projectRoot, requirementId, "subtask-active0001");
    await writeDevTask(projectRoot, requirementId, "subtask-done000002", {
      status: "done",
      review_status: "passed"
    });
    await createBreakdownDraft({
      projectRoot,
      requirementId,
      draftPayload: validDraft(requirementId)
    });

    const result = await cancelRequirement({
      projectRoot,
      requirementId,
      reason: "not needed",
      sourceActor: "ccb_claude",
      dispatchRef: { jobId: "job-cancel-happy" },
      now: "2026-06-06T10:10:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.resumed, false);
    assert.equal(await readRequirementStatus(projectRoot, requirementId), "cancelled");
    assert.equal((await readTaskState({ projectRoot, taskId: "subtask-active0001" })).frontmatter.status, "cancelled");
    assert.equal((await readTaskState({ projectRoot, taskId: "subtask-done000002" })).frontmatter.status, "done");
    assert.equal(await pathPresent(join(projectRoot, "docs", ".ccb", "drafts", "breakdown", `${requirementId}.json`)), false);
    assert.deepEqual((await listDevTasksByRequirement({ projectRoot, requirementId })).map((task) => task.taskId), [
      "subtask-active0001",
      "subtask-done000002"
    ]);

    const events = await readEvents(projectRoot);
    assert.ok(events.some((event) => event.type === "user_cancel_authorized" && event.subject_type === "requirement"));
    assert.ok(events.some((event) => event.type === "user_cancel_authorized" && event.subject_id === "subtask-active0001"));
    assert.ok(events.some((event) => event.type === "breakdown_draft_deleted"));
    const summary = events.find((event) => event.type === "requirement_cancel_cascade_completed");
    assert.ok(summary);
    assert.deepEqual(summary.payload.cancelled_task_ids, ["subtask-active0001"]);
    assert.equal(summary.payload.skipped.worktree, "missing");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("cancelRequirement resumes cleanup when requirement is already cancelled", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-cancel-resume";
  try {
    await writeRequirement(projectRoot, requirementId, "cancelled");
    await writeDevTask(projectRoot, requirementId, "subtask-resume0001");

    const result = await cancelRequirement({
      projectRoot,
      requirementId,
      reason: "retry cleanup",
      dispatchRef: { jobId: "job-cancel-resume" }
    });

    assert.equal(result.ok, true);
    assert.equal(result.resumed, true);
    assert.equal((await readTaskState({ projectRoot, taskId: "subtask-resume0001" })).frontmatter.status, "cancelled");
    const events = await readEvents(projectRoot);
    assert.equal(events.filter((event) => event.type === "user_cancel_authorized" && event.subject_type === "requirement").length, 0);
    assert.ok(events.some((event) => event.type === "requirement_cancel_cascade_completed" && event.payload.resumed === true));
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("cancel lib appends capability_outcome_rejected for guard and must_ask failures", async () => {
  const projectRoot = await tempProject();
  try {
    await writeRequirement(projectRoot, "req-cancel-delivered-lib", "delivered");
    const delivered = await cancelRequirement({
      projectRoot,
      requirementId: "req-cancel-delivered-lib",
      dispatchRef: { jobId: "job-guard-fail" }
    });
    assert.equal(delivered.ok, false);
    assert.equal(delivered.code, "GUARD_FAILED");

    await writeRequirement(projectRoot, "req-cancel-mustask-lib", "planning");
    const mustAsk = await cancelRequirement({
      projectRoot,
      requirementId: "req-cancel-mustask-lib",
      authorized: false,
      dispatchRef: { jobId: "job-mustask-fail" }
    });
    assert.equal(mustAsk.ok, false);
    assert.equal(mustAsk.code, "MUST_ASK_APPROVAL_MISSING");

    const rejected = (await readEvents(projectRoot)).filter((event) => event.type === "capability_outcome_rejected");
    assert.ok(rejected.some((event) =>
      event.subject_type === "requirement" &&
      event.subject_id === "req-cancel-delivered-lib" &&
      event.payload.capability_id === "requirement.cancel" &&
      event.payload.code === "GUARD_FAILED"
    ));
    assert.ok(rejected.some((event) =>
      event.subject_type === "requirement" &&
      event.subject_id === "req-cancel-mustask-lib" &&
      event.payload.capability_id === "requirement.cancel" &&
      event.payload.code === "MUST_ASK_APPROVAL_MISSING"
    ));
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("cancelSubtask rereads and retries once after CAS conflict", async () => {
  const projectRoot = await tempProject();
  try {
    await writeDevTask(projectRoot, "req-cas-retry", "subtask-cas000001");
    let changed = false;
    const result = await cancelSubtask({
      projectRoot,
      taskId: "subtask-cas000001",
      dispatchRef: { jobId: "job-cas-retry" },
      testHooks: {
        beforeSubtaskApply: async ({ task, attempt }) => {
          if (attempt !== 1 || changed) return;
          changed = true;
          await writeTaskState({
            projectRoot,
            taskId: task.taskId,
            patch: { node_substate: "changed_before_cancel" },
            expectedHash: task.hash,
            now: "2026-06-06T10:20:00.000Z",
            updatedBy: "ccb_test",
            audit: { runId: "cas-test-change" }
          });
        }
      }
    });

    assert.equal(result.ok, true);
    assert.equal(changed, true);
    assert.equal((await readTaskState({ projectRoot, taskId: "subtask-cas000001" })).frontmatter.status, "cancelled");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

function codeWorkspace(requirementId) {
  return {
    path: `../SU-CCB-req-${requirementId}`,
    branch: `ccb/req-${requirementId}`
  };
}

function worktreePath(projectRoot, requirementId) {
  return resolve(projectRoot, codeWorkspace(requirementId).path);
}

async function readWorktreeState(projectRoot, requirementId) {
  return JSON.parse(await readFile(requirementWorktreeStatePath(projectRoot, requirementId), "utf8"));
}

test("cancelRequirement dispatches ready worktree to discard", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const requirementId = "req-worktree-ready";
  try {
    await writeRequirement(projectRoot, requirementId, "planning");
    await ensureRequirementWorktree({
      projectRoot,
      requirementId,
      codeWorkspace: codeWorkspace(requirementId)
    });

    const result = await cancelRequirement({
      projectRoot,
      requirementId,
      dispatchRef: { jobId: "job-worktree-ready" }
    });

    assert.equal(result.ok, true);
    assert.equal((await readWorktreeState(projectRoot, requirementId)).aggregate_status, "discarded");
    assert.equal(await pathPresent(worktreePath(projectRoot, requirementId)), false);
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});

test("cancelRequirement dispatches merged worktree to cleanup and skips archived state", async () => {
  const { baseDir, projectRoot } = await tempGitProject();
  const mergedRequirementId = "req-worktree-merged";
  const archivedRequirementId = "req-worktree-archived";
  try {
    await writeRequirement(projectRoot, mergedRequirementId, "planning");
    await ensureRequirementWorktree({
      projectRoot,
      requirementId: mergedRequirementId,
      codeWorkspace: codeWorkspace(mergedRequirementId)
    });
    await writeFile(join(worktreePath(projectRoot, mergedRequirementId), "feature.txt"), "feature\n", "utf8");
    await git(worktreePath(projectRoot, mergedRequirementId), ["add", "feature.txt"]);
    await git(worktreePath(projectRoot, mergedRequirementId), ["commit", "-m", "feature"]);
    const merged = await mergeRequirementWorktree({
      projectRoot,
      requirementId: mergedRequirementId,
      codeWorkspace: codeWorkspace(mergedRequirementId)
    });
    assert.equal(merged.status, "merged");

    const cleanup = await cancelRequirement({
      projectRoot,
      requirementId: mergedRequirementId,
      dispatchRef: { jobId: "job-worktree-merged" }
    });
    assert.equal(cleanup.ok, true);
    assert.equal((await readWorktreeState(projectRoot, mergedRequirementId)).aggregate_status, "archived");
    assert.equal(await pathPresent(worktreePath(projectRoot, mergedRequirementId)), false);

    await writeRequirement(projectRoot, archivedRequirementId, "planning");
    await mkdir(join(projectRoot, "docs", ".ccb", "worktrees"), { recursive: true });
    await writeFile(requirementWorktreeStatePath(projectRoot, archivedRequirementId), JSON.stringify({
      schema_version: "requirement-worktree-v0.1",
      requirement_id: archivedRequirementId,
      status: "archived",
      path: codeWorkspace(archivedRequirementId).path,
      branch: codeWorkspace(archivedRequirementId).branch,
      confirmed_target_branch: "main",
      updated_at: "2026-06-06T10:00:00.000Z"
    }, null, 2), "utf8");
    const skipped = await cancelRequirement({
      projectRoot,
      requirementId: archivedRequirementId,
      dispatchRef: { jobId: "job-worktree-archived" }
    });
    assert.equal(skipped.ok, true);
    assert.ok(skipped.steps.some((step) => step.step === "worktree" && step.status === "skipped" && step.reason === "archived"));
  } finally {
    await rm(baseDir, { recursive: true, force: true });
  }
});
