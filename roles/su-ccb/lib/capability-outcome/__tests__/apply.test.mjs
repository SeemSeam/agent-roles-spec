import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { appendEvent, hashContent } from "../../runtime/index.mjs";
import { readTaskState, writeTaskState } from "../../state/index.mjs";
import { applyCapabilityOutcome } from "../index.mjs";

async function tempProject() {
  const root = join(tmpdir(), `ccb-capability-apply-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  return root;
}

async function readEvents(projectRoot) {
  const journal = await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8");
  return journal.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function seedDriftEvent(projectRoot, idempotencyKey = "drift-detected:test:rec-1") {
  await appendEvent(
    {
      type: "drift_detected",
      subject_type: "subtask",
      subject_id: "subtask-abcdef123456",
      payload: { drift_id: "rec-1" },
      idempotency_key: idempotencyKey,
      emitted_at: "2026-05-23T10:00:00.000Z",
      source_actor: "ccb_claude"
    },
    { projectRoot }
  );
}

function requirementPath(id) {
  return `docs/02_需求设计/${id}.md`;
}

async function writeRequirementMarkdown(projectRoot, id, status = "planning") {
  const relativePath = requirementPath(id);
  const path = join(projectRoot, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  const content = [
    "---",
    `id: ${id}`,
    `status: ${status}`,
    "---",
    "",
    "# Requirement",
    ""
  ].join("\n");
  await writeFile(path, content, "utf8");
  return { path, relativePath, content, hash: hashContent(content) };
}

async function seedTerminalTaskStates(projectRoot, requirementId, taskKeys, overrides = {}) {
  for (const taskKey of taskKeys) {
    const path = join(projectRoot, "docs", "03_开发计划", `${taskKey}-开发任务.md`);
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, [
      "---",
      "doc_type: dev_task",
      `task_id: ${taskKey}`,
      `title: ${taskKey}`,
      `status: ${overrides[taskKey]?.status ?? "done"}`,
      `current_node: ${overrides[taskKey]?.current_node ?? "archive"}`,
      "node_substate: archived",
      `review_status: ${overrides[taskKey]?.review_status ?? "passed"}`,
      "priority: medium",
      `requirement_id: ${requirementId}`,
      "section_id: pr1-finalize",
      "order: 1",
      "implementation_owner: ccb_codex",
      "dependencies: []",
      `source_breakdown_draft: docs/.ccb/drafts/breakdown/${requirementId}.json`,
      `source_draft_hash: ${"a".repeat(64)}`,
      "created_at: 2026-05-28T10:00:00.000Z",
      "---",
      "",
      "# Dev Task",
      ""
    ].join("\n"), "utf8");
  }
}

async function seedDevTask(projectRoot, taskKey, overrides = {}) {
  const path = join(projectRoot, "docs", "03_开发计划", `${taskKey}-开发任务.md`);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, [
    "---",
    "doc_type: dev_task",
    `task_id: ${taskKey}`,
    `title: ${taskKey}`,
    `status: ${overrides.status ?? "reviewing"}`,
    `current_node: ${overrides.current_node ?? "dispatch"}`,
    `node_substate: ${overrides.node_substate ?? "awaiting_codex_pickup"}`,
    ...(overrides.review_status ? [`review_status: ${overrides.review_status}`] : []),
    "priority: medium",
    "requirement_id: req-apply",
    "section_id: pr1-apply",
    "order: 1",
    "implementation_owner: ccb_codex",
    "dependencies: []",
    "source_breakdown_draft: docs/.ccb/drafts/breakdown/req-apply.json",
    `source_draft_hash: ${"a".repeat(64)}`,
    "created_at: 2026-05-28T10:00:00.000Z",
    "---",
    "",
    "# Dev Task",
    "",
    "- This dev task fixture has enough content for schema validation.",
    "- Capability outcome writes state into this frontmatter.",
    ""
  ].join("\n"), "utf8");
  return path;
}

async function seedBatchAuthorization(projectRoot, requirementId, taskKeys) {
  const idempotencyKey = `batch-authorization:${requirementId}`;
  await appendEvent(
    {
      type: "batch_authorization_completed",
      subject_type: "requirement",
      subject_id: requirementId,
      payload: {
        batch_id: `batch-${requirementId}`,
        requirement_id: requirementId,
        status: "completed",
        members: taskKeys.map((taskKey) => ({ task_key: taskKey })),
        execution_order: taskKeys
      },
      idempotency_key: idempotencyKey,
      emitted_at: "2026-05-23T10:30:00.000Z",
      source_actor: "ccb_claude"
    },
    { projectRoot }
  );
  return idempotencyKey;
}

async function seedDispatchSubmitted(projectRoot, requirementId) {
  const idempotencyKey = `dispatch-submitted:${requirementId}`;
  await appendEvent(
    {
      type: "anchor_dispatch_submitted",
      subject_type: "requirement",
      subject_id: requirementId,
      payload: {
        job_id: `job-${requirementId}`,
        requirement_id: requirementId,
        slot_id: "slot-1",
        agent_id: "slot1_codex"
      },
      idempotency_key: idempotencyKey,
      emitted_at: "2026-06-07T10:00:00.000Z",
      source_actor: "ccb_claude"
    },
    { projectRoot }
  );
  return idempotencyKey;
}

function terminalScopeEvidence(requirementId, taskKeys) {
  return [
    {
      kind: "C",
      ref: `dev-task-scope:${taskKeys.join(",")}`,
      check_id: "dev_task_scope_terminal",
      params: {
        requirement_id: requirementId,
        authorization_event_id: `batch-authorization:${requirementId}`,
        task_keys: taskKeys,
        dev_task_paths: taskKeys.map((taskKey) => `docs/03_开发计划/${taskKey}-开发任务.md`)
      }
    }
  ];
}

function terminalRequirementEvidence(requirementId) {
  return [
    {
      kind: "C",
      ref: `dev-task-requirement:${requirementId}`,
      check_id: "dev_task_requirement_terminal",
      params: { requirement_id: requirementId }
    }
  ];
}

function requirementHashEvidence(requirement) {
  return [
    {
      kind: "A",
      ref: `requirement-md:${requirement.relativePath}`,
      check_id: "hash_matches",
      params: {
        path: requirement.relativePath,
        expected_hash: requirement.hash
      }
    }
  ];
}

function dispatchSubmittedEvidence(idempotencyKey) {
  return [
    {
      kind: "A",
      ref: idempotencyKey,
      check_id: "journal_event_exists",
      params: {
        idempotency_key: idempotencyKey,
        event_type: "anchor_dispatch_submitted"
      }
    }
  ];
}

test("missing policy returns POLICY_NOT_FOUND", async () => {
  const projectRoot = await tempProject();
  try {
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "missing.capability",
      outcomeType: "missing",
      subjectRef: { subject_type: "subtask", subject_id: "subtask-abcdef123456" }
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "POLICY_NOT_FOUND");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("missing evidence returns EVIDENCE_MISSING", async () => {
  const projectRoot = await tempProject();
  try {
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "reconcile.apply",
      outcomeType: "reconcile_drift_repaired",
      subjectRef: { subject_type: "subtask", subject_id: "subtask-abcdef123456" },
      stateInput: { node_substate: "reconciled" }
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "EVIDENCE_MISSING");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("missing approval returns MUST_ASK_APPROVAL_MISSING", async () => {
  const projectRoot = await tempProject();
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, "req-cancel-1", "planning");
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.cancel",
      outcomeType: "cancelled",
      subjectRef: {
        subject_type: "requirement",
        subject_id: "req-cancel-1",
        canonical_path: requirement.relativePath
      },
      stateInput: { status: "cancelled" },
      evidence: [
        {
          kind: "A",
          ref: `file:${requirement.relativePath}`,
          check_id: "file_exists",
          params: { path: requirement.relativePath }
        }
      ]
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "MUST_ASK_APPROVAL_MISSING");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("dryRun validates and writes nothing", async () => {
  const projectRoot = await tempProject();
  try {
    await seedDriftEvent(projectRoot);
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "reconcile.apply",
      outcomeType: "reconcile_drift_repaired",
      subjectRef: { subject_type: "subtask", subject_id: "subtask-abcdef123456" },
      stateInput: { node_substate: "reconciled" },
      evidence: [
        {
          kind: "A",
          ref: "drift-detected:test:rec-1",
          check_id: "journal_event_exists",
          params: { idempotency_key: "drift-detected:test:rec-1", event_type: "drift_detected" }
        }
      ],
      dryRun: true
    });

    assert.equal(result.ok, true);
    assert.equal(await readTaskState({ projectRoot, taskId: "subtask-abcdef123456" }), null);
    const events = await readEvents(projectRoot);
    assert.deepEqual(events.map((event) => event.type), ["drift_detected"]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("successful apply writes capability_outcome_applied and audited task state", async () => {
  const projectRoot = await tempProject();
  try {
    await seedDriftEvent(projectRoot);
    await seedDevTask(projectRoot, "subtask-abcdef123456");
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "reconcile.apply",
      outcomeType: "reconcile_drift_repaired",
      subjectRef: { subject_type: "subtask", subject_id: "subtask-abcdef123456" },
      stateInput: { node_substate: "reconciled" },
      evidence: [
        {
          kind: "A",
          ref: "drift-detected:test:rec-1",
          check_id: "journal_event_exists",
          params: { idempotency_key: "drift-detected:test:rec-1", event_type: "drift_detected" }
        }
      ],
      now: "2026-05-23T10:10:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.policy_id, "reconcile.apply:reconcile_drift_repaired:subtask");
    const state = await readTaskState({ projectRoot, taskId: "subtask-abcdef123456" });
    assert.equal(state.frontmatter.status, "reviewing");
    assert.equal(state.frontmatter.node_substate, "reconciled");

    const events = await readEvents(projectRoot);
    assert.ok(events.some((event) => event.type === "capability_outcome_applied"));
    assert.ok(events.some((event) => event.type === "state_write_intent"));
    assert.ok(events.some((event) => event.type === "state_write_done"));
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("CAS conflict returns CAS_CONFLICT and preserves canonical state", async () => {
  const projectRoot = await tempProject();
  try {
    await seedDriftEvent(projectRoot);
    await seedDevTask(projectRoot, "subtask-abcdef123456");
    const created = await readTaskState({ projectRoot, taskId: "subtask-abcdef123456" });
    await writeTaskState({
      projectRoot,
      taskId: "subtask-abcdef123456",
      patch: { node_substate: "changed" },
      expectedHash: created.hash,
      now: "2026-05-23T10:00:00.000Z",
      audit: { runId: "seed-state" }
    });

    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "reconcile.apply",
      outcomeType: "reconcile_drift_repaired",
      subjectRef: { subject_type: "subtask", subject_id: "subtask-abcdef123456" },
      stateInput: { node_substate: "reconciled" },
      expectedHash: created.hash,
      evidence: [
        {
          kind: "A",
          ref: "drift-detected:test:rec-1",
          check_id: "journal_event_exists",
          params: { idempotency_key: "drift-detected:test:rec-1", event_type: "drift_detected" }
        }
      ]
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "CAS_CONFLICT");
    assert.match(await readFile(created.path, "utf8"), /node_substate: changed/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.promote writes drafting requirement to planning", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-promote-drafting";
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "drafting");
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.promote",
      outcomeType: "planning",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        canonical_path: requirement.relativePath,
        base_hash: requirement.hash
      },
      expectedHash: requirement.hash,
      evidence: requirementHashEvidence(requirement),
      now: "2026-06-02T10:00:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.policy_id, "requirement.promote:planning:requirement");
    assert.equal(result.state_effects.status, "planning");
    assert.match(await readFile(requirement.path, "utf8"), /status: planning/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.promote treats current planning as an idempotent no-op", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-promote-planning";
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "planning");
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.promote",
      outcomeType: "planning",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        canonical_path: requirement.relativePath,
        base_hash: requirement.hash
      },
      expectedHash: requirement.hash,
      evidence: requirementHashEvidence(requirement)
    });

    assert.equal(result.ok, true);
    assert.equal(result.noop, true);
    assert.equal(result.write_result, null);
    assert.equal(hashContent(await readFile(requirement.path, "utf8")), requirement.hash);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.promote refuses non-forward statuses without overwriting", async () => {
  for (const status of ["delivering", "delivered", "deferred", "cancelled"]) {
    const projectRoot = await tempProject();
    const requirementId = `req-promote-${status}`;
    try {
      const requirement = await writeRequirementMarkdown(projectRoot, requirementId, status);
      const result = await applyCapabilityOutcome({
        projectRoot,
        capabilityId: "requirement.promote",
        outcomeType: "planning",
        subjectRef: {
          subject_type: "requirement",
          subject_id: requirementId,
          canonical_path: requirement.relativePath,
          base_hash: requirement.hash
        },
        expectedHash: requirement.hash,
        evidence: requirementHashEvidence(requirement)
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, "GUARD_FAILED");
      assert.match(result.issues.join("\n"), new RegExp(`cannot override ${status}`));
      assert.match(await readFile(requirement.path, "utf8"), new RegExp(`status: ${status}`));
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  }
});

test("requirement.promote delivering writes planning requirement to delivering", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-promote-delivering";
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "planning");
    const evidenceRef = await seedDispatchSubmitted(projectRoot, requirementId);
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.promote",
      outcomeType: "delivering",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        canonical_path: requirement.relativePath,
        base_hash: requirement.hash
      },
      expectedHash: requirement.hash,
      evidence: dispatchSubmittedEvidence(evidenceRef),
      now: "2026-06-07T10:05:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.policy_id, "requirement.promote:delivering:requirement");
    assert.equal(result.state_effects.status, "delivering");
    assert.match(await readFile(requirement.path, "utf8"), /status: delivering/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.promote delivering treats current delivering as an idempotent no-op", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-promote-delivering-noop";
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "delivering");
    const evidenceRef = await seedDispatchSubmitted(projectRoot, requirementId);
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.promote",
      outcomeType: "delivering",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        canonical_path: requirement.relativePath,
        base_hash: requirement.hash
      },
      expectedHash: requirement.hash,
      evidence: dispatchSubmittedEvidence(evidenceRef)
    });

    assert.equal(result.ok, true);
    assert.equal(result.noop, true);
    assert.equal(result.write_result, null);
    assert.equal(hashContent(await readFile(requirement.path, "utf8")), requirement.hash);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.promote delivering refuses non-planning statuses without overwriting", async () => {
  for (const status of ["drafting", "delivered", "deferred", "cancelled"]) {
    const projectRoot = await tempProject();
    const requirementId = `req-promote-delivering-${status}`;
    try {
      const requirement = await writeRequirementMarkdown(projectRoot, requirementId, status);
      const evidenceRef = await seedDispatchSubmitted(projectRoot, requirementId);
      const result = await applyCapabilityOutcome({
        projectRoot,
        capabilityId: "requirement.promote",
        outcomeType: "delivering",
        subjectRef: {
          subject_type: "requirement",
          subject_id: requirementId,
          canonical_path: requirement.relativePath,
          base_hash: requirement.hash
        },
        expectedHash: requirement.hash,
        evidence: dispatchSubmittedEvidence(evidenceRef)
      });

      assert.equal(result.ok, false);
      assert.equal(result.code, "GUARD_FAILED");
      assert.match(result.issues.join("\n"), new RegExp(`cannot mark ${status} requirement delivering`));
      assert.match(await readFile(requirement.path, "utf8"), new RegExp(`status: ${status}`));
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  }
});

test("requirement.promote requires expected hash or subjectRef base hash", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-promote-missing-hash";
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "drafting");
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.promote",
      outcomeType: "planning",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        canonical_path: requirement.relativePath
      },
      evidence: requirementHashEvidence(requirement)
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "GUARD_FAILED");
    assert.match(result.issues.join("\n"), /requires expectedHash or subjectRef\.base_hash/);
    assert.match(await readFile(requirement.path, "utf8"), /status: drafting/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.promote requires canonical path", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-promote-missing-path";
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "drafting");
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.promote",
      outcomeType: "planning",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        base_hash: requirement.hash
      },
      evidence: requirementHashEvidence(requirement)
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "GUARD_FAILED");
    assert.match(result.issues.join("\n"), /requires subjectRef\.canonical_path/);
    assert.match(await readFile(requirement.path, "utf8"), /status: drafting/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.promote rejects stale base hash and preserves canonical state", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-promote-stale-hash";
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "drafting");
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.promote",
      outcomeType: "planning",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        canonical_path: requirement.relativePath,
        base_hash: "0".repeat(64)
      },
      evidence: requirementHashEvidence(requirement)
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "CAS_CONFLICT");
    assert.match(await readFile(requirement.path, "utf8"), /status: drafting/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.finalize writes delivered through requirement markdown with terminal scope evidence", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-finalize-1";
  const taskKeys = ["subtask-111111111111", "subtask-222222222222"];
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "planning");
    await seedTerminalTaskStates(projectRoot, requirementId, taskKeys);
    await seedBatchAuthorization(projectRoot, requirementId, taskKeys);

    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.finalize",
      outcomeType: "delivered",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        canonical_path: requirement.relativePath,
        base_hash: requirement.hash
      },
      expectedHash: requirement.hash,
      evidence: terminalScopeEvidence(requirementId, taskKeys),
      now: "2026-05-23T11:00:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.policy_id, "requirement.finalize:delivered:requirement");
    assert.match(await readFile(requirement.path, "utf8"), /status: delivered/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.finalize writes delivered through requirement-wide terminal evidence without batch authorization", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-finalize-requirement";
  const taskKeys = ["subtask-111111111111", "subtask-222222222222"];
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "planning");
    await seedTerminalTaskStates(projectRoot, requirementId, taskKeys);

    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.finalize",
      outcomeType: "delivered",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        canonical_path: requirement.relativePath,
        base_hash: requirement.hash
      },
      expectedHash: requirement.hash,
      evidence: terminalRequirementEvidence(requirementId),
      now: "2026-05-23T11:05:00.000Z"
    });

    assert.equal(result.ok, true);
    assert.equal(result.policy_id, "requirement.finalize:delivered:requirement");
    assert.match(await readFile(requirement.path, "utf8"), /status: delivered/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.finalize rejects incomplete scope and leaves requirement status unchanged", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-finalize-incomplete";
  const taskKeys = ["subtask-111111111111", "subtask-222222222222"];
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "planning");
    await seedTerminalTaskStates(projectRoot, requirementId, taskKeys, {
      "subtask-222222222222": {
        status: "reviewing",
        current_node: "review"
      }
    });
    await seedBatchAuthorization(projectRoot, requirementId, taskKeys);

    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.finalize",
      outcomeType: "delivered",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        canonical_path: requirement.relativePath,
        base_hash: requirement.hash
      },
      expectedHash: requirement.hash,
      evidence: terminalScopeEvidence(requirementId, taskKeys)
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "EVIDENCE_MISSING");
    assert.match(await readFile(requirement.path, "utf8"), /status: planning/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.finalize rejects concurrent cancellation by expectedHash CAS", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-finalize-cancelled-cas";
  const taskKeys = ["subtask-111111111111"];
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "planning");
    await seedTerminalTaskStates(projectRoot, requirementId, taskKeys);
    await seedBatchAuthorization(projectRoot, requirementId, taskKeys);
    await writeFile(requirement.path, requirement.content.replace("status: planning", "status: cancelled"), "utf8");

    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.finalize",
      outcomeType: "delivered",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        canonical_path: requirement.relativePath,
        base_hash: requirement.hash
      },
      expectedHash: requirement.hash,
      evidence: terminalScopeEvidence(requirementId, taskKeys),
      retryPolicy: { maxAttempts: 1, initialDelayMs: 1, multiplier: 1, maxDelayMs: 1 }
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "CAS_CONFLICT");
    assert.match(await readFile(requirement.path, "utf8"), /status: cancelled/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("requirement.finalize refuses current cancelled requirement even with current hash", async () => {
  const projectRoot = await tempProject();
  const requirementId = "req-finalize-cancelled-current";
  const taskKeys = ["subtask-111111111111"];
  try {
    const requirement = await writeRequirementMarkdown(projectRoot, requirementId, "cancelled");
    await seedTerminalTaskStates(projectRoot, requirementId, taskKeys);
    await seedBatchAuthorization(projectRoot, requirementId, taskKeys);

    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "requirement.finalize",
      outcomeType: "delivered",
      subjectRef: {
        subject_type: "requirement",
        subject_id: requirementId,
        canonical_path: requirement.relativePath,
        base_hash: requirement.hash
      },
      expectedHash: requirement.hash,
      evidence: terminalScopeEvidence(requirementId, taskKeys)
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "GUARD_FAILED");
    assert.match(result.issues.join("\n"), /cannot override cancelled/);
    assert.match(await readFile(requirement.path, "utf8"), /status: cancelled/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("fail-closed applied event error prevents canonical write", async () => {
  const projectRoot = await tempProject();
  try {
    await seedDriftEvent(projectRoot);
    await seedDevTask(projectRoot, "subtask-abcdef123456");
    const result = await applyCapabilityOutcome({
      projectRoot,
      capabilityId: "reconcile.apply",
      outcomeType: "reconcile_drift_repaired",
      subjectRef: { subject_type: "subtask", subject_id: "subtask-abcdef123456" },
      stateInput: { node_substate: "reconciled" },
      evidence: [
        {
          kind: "A",
          ref: "drift-detected:test:rec-1",
          check_id: "journal_event_exists",
          params: { idempotency_key: "drift-detected:test:rec-1", event_type: "drift_detected" }
        }
      ],
      journalPath: projectRoot,
      retryPolicy: { maxAttempts: 1, initialDelayMs: 1, multiplier: 1, maxDelayMs: 1 }
    });

    assert.equal(result.ok, false);
    assert.equal(result.code, "MAX_RETRY_EXCEEDED");
    const state = await readTaskState({ projectRoot, taskId: "subtask-abcdef123456" });
    assert.equal(state.frontmatter.node_substate, "awaiting_codex_pickup");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
