import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { appendEvent, hashContent } from "../../runtime/index.mjs";
import {
  runEvidenceCheck,
  validateEvidenceSet
} from "../evidence-registry.mjs";
import { validateMustAskApprovals } from "../must-ask.mjs";

async function tempProject() {
  const root = join(tmpdir(), `ccb-capability-evidence-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  return root;
}

async function writeText(projectRoot, relativePath, content) {
  const path = join(projectRoot, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content, "utf8");
  return path;
}

test("fixed evidence checks pass and fail deterministically", async () => {
  const projectRoot = await tempProject();
  try {
    const path = "docs/03_开发计划/evidence-note.md";
    const content = "hello evidence\n";
    await writeText(projectRoot, path, content);
    await writeText(projectRoot, "docs/03_开发计划/subtask-abcdef123456-开发任务.md", [
      "---",
      "task_id: subtask-abcdef123456",
      "doc_type: dev_task",
      "status: reviewing",
      "current_node: review",
      "node_substate: pending",
      "---",
      "",
      "# Dev Task",
      ""
    ].join("\n"));
    await appendEvent(
      {
        type: "drift_detected",
        subject_type: "subtask",
        subject_id: "subtask-abcdef123456",
        payload: { drift_id: "rec-1" },
        idempotency_key: "drift-detected:test:rec-1",
        emitted_at: "2026-05-23T10:00:00.000Z",
        source_actor: "ccb_claude"
      },
      { projectRoot }
    );

    assert.equal((await runEvidenceCheck(projectRoot, { check_id: "file_exists", params: { path } })).ok, true);
    assert.equal(
      (await runEvidenceCheck(projectRoot, {
        check_id: "hash_matches",
        params: { path, expected_hash: hashContent(content) }
      })).ok,
      true
    );
    assert.equal(
      (await runEvidenceCheck(projectRoot, {
        check_id: "journal_event_exists",
        params: { idempotency_key: "drift-detected:test:rec-1", event_type: "drift_detected" }
      })).ok,
      true
    );
    assert.equal(
      (await runEvidenceCheck(projectRoot, {
        check_id: "count_gt_zero",
        params: { source_type: "event_journal", selector: "drift_detected" }
      })).ok,
      true
    );
    assert.equal(
      (await runEvidenceCheck(projectRoot, {
        check_id: "count_gt_zero",
        params: { source_type: "glob", selector: "dev_task_docs" }
      })).ok,
      true
    );
    assert.equal((await runEvidenceCheck(projectRoot, { check_id: "file_exists", params: { path: "../escape" } })).ok, false);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("schema_valid validates dev_task markdown", async () => {
  const projectRoot = await tempProject();
  try {
    const path = "docs/03_开发计划/subtask-abcdef123456-开发任务.md";
    await writeText(
      projectRoot,
      path,
      [
        "---",
        "doc_type: dev_task",
        "task_id: subtask-abcdef123456",
        "title: Schema valid dev task",
        "status: reviewing",
        "current_node: dispatch",
        "node_substate: awaiting_codex_pickup",
        "priority: medium",
        "requirement_id: req-1",
        "section_id: pr1-schema-valid",
        "order: 1",
        "implementation_owner: ccb_codex",
        "dependencies: []",
        "source_breakdown_draft: docs/.ccb/drafts/breakdown/req-1.json",
        `source_draft_hash: ${"a".repeat(64)}`,
        "created_at: 2026-05-28T10:00:00.000Z",
        "---",
        "",
        "# Schema valid dev task",
        "",
        "- This dev task body is long enough for schema validation.",
        ""
      ].join("\n")
    );

    const result = await runEvidenceCheck(projectRoot, {
      check_id: "schema_valid",
      params: { path, schema_name: "dev-task" }
    });

    assert.equal(result.ok, true);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

async function seedBatchAuthorization(projectRoot, requirementId, taskKeys) {
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
      idempotency_key: `batch-authorization:${requirementId}`,
      emitted_at: "2026-05-23T10:30:00.000Z",
      source_actor: "ccb_claude"
    },
    { projectRoot }
  );
}

test("dev_task_scope_terminal reads terminal scope from dev_task frontmatter", async () => {
  const projectRoot = await tempProject();
  const devTask = (taskId, status = "done", reviewStatus = "passed") => [
    "---",
    "doc_type: dev_task",
    `task_id: ${taskId}`,
    `title: ${taskId}`,
    `status: ${status}`,
    "current_node: archive",
    "node_substate: archived",
    `review_status: ${reviewStatus}`,
    "priority: medium",
    "requirement_id: req-1",
    "section_id: pr1-evidence",
    "order: 1",
    "implementation_owner: ccb_codex",
    "dependencies: []",
    "source_breakdown_draft: docs/.ccb/drafts/breakdown/req-1.json",
    `source_draft_hash: ${"a".repeat(64)}`,
    "created_at: 2026-05-28T10:00:00.000Z",
    "---",
    "",
    "# Dev Task",
    ""
  ].join("\n");

  try {
    await seedBatchAuthorization(projectRoot, "req-1", ["subtask-111111111111", "subtask-222222222222"]);
    await seedBatchAuthorization(projectRoot, "req-2", ["subtask-111111111111", "subtask-333333333333"]);
    await writeText(projectRoot, "docs/03_开发计划/subtask-111111111111-开发任务.md", devTask("subtask-111111111111"));
    await writeText(projectRoot, "docs/03_开发计划/subtask-222222222222-开发任务.md", devTask("subtask-222222222222"));
    await writeText(projectRoot, "docs/03_开发计划/subtask-333333333333-开发任务.md", devTask("subtask-333333333333", "reviewing"));

    const ok = await runEvidenceCheck(projectRoot, {
      check_id: "dev_task_scope_terminal",
      params: {
        requirement_id: "req-1",
        authorization_event_id: "batch-authorization:req-1",
        task_keys: ["subtask-111111111111", "subtask-222222222222"],
        dev_task_paths: [
          "docs/03_开发计划/subtask-111111111111-开发任务.md",
          "docs/03_开发计划/subtask-222222222222-开发任务.md"
        ]
      }
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.task_count, 2);

    const missing = await runEvidenceCheck(projectRoot, {
      check_id: "dev_task_scope_terminal",
      params: {
        requirement_id: "req-1",
        authorization_event_id: "batch-authorization:req-1",
        task_keys: ["subtask-111111111111", "subtask-222222222222"],
        dev_task_paths: ["docs/03_开发计划/subtask-111111111111-开发任务.md"]
      }
    });
    assert.equal(missing.ok, false);
    assert.match(missing.reason, /same length/);

    const scopeMismatch = await runEvidenceCheck(projectRoot, {
      check_id: "dev_task_scope_terminal",
      params: {
        requirement_id: "req-1",
        authorization_event_id: "batch-authorization:req-1",
        task_keys: ["subtask-111111111111", "subtask-333333333333"],
        dev_task_paths: [
          "docs/03_开发计划/subtask-111111111111-开发任务.md",
          "docs/03_开发计划/subtask-333333333333-开发任务.md"
        ]
      }
    });
    assert.equal(scopeMismatch.ok, false);
    assert.match(scopeMismatch.reason, /members\.task_key/);

    const notTerminal = await runEvidenceCheck(projectRoot, {
      check_id: "dev_task_scope_terminal",
      params: {
        requirement_id: "req-2",
        authorization_event_id: "batch-authorization:req-2",
        task_keys: ["subtask-111111111111", "subtask-333333333333"],
        dev_task_paths: [
          "docs/03_开发计划/subtask-111111111111-开发任务.md",
          "docs/03_开发计划/subtask-333333333333-开发任务.md"
        ]
      }
    });
    assert.equal(notTerminal.ok, false);
    assert.match(notTerminal.reason, /not done/);

    await writeText(projectRoot, "docs/03_开发计划/subtask-missing-review-开发任务.md", [
      "---",
      "task_id: subtask-missing-review",
      "title: Missing review",
      "doc_type: dev_task",
      "status: done",
      "current_node: archive",
      "node_substate: completed",
      "---",
      "",
      "# Missing review",
      ""
    ].join("\n"));
    await seedBatchAuthorization(projectRoot, "req-missing-review", ["subtask-missing-review"]);
    const missingReview = await runEvidenceCheck(projectRoot, {
      check_id: "dev_task_scope_terminal",
      params: {
        requirement_id: "req-missing-review",
        authorization_event_id: "batch-authorization:req-missing-review",
        task_keys: ["subtask-missing-review"],
        dev_task_paths: ["docs/03_开发计划/subtask-missing-review-开发任务.md"]
      }
    });
    assert.equal(missingReview.ok, false);
    assert.match(missingReview.reason, /review_status missing/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("dev_task_requirement_terminal scans all non-cancelled dev_tasks for requirement", async () => {
  const projectRoot = await tempProject();
  const devTask = (taskId, requirementId, overrides = {}) => [
    "---",
    "doc_type: dev_task",
    `task_id: ${taskId}`,
    `title: ${taskId}`,
    `status: ${overrides.status ?? "done"}`,
    `current_node: ${overrides.current_node ?? "archive"}`,
    "node_substate: archived",
    ...(overrides.review_status === null ? [] : [`review_status: ${overrides.review_status ?? "passed"}`]),
    "priority: medium",
    `requirement_id: ${requirementId}`,
    "section_id: pr1-evidence",
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
  ].join("\n");

  try {
    await writeText(projectRoot, "docs/03_开发计划/subtask-a-开发任务.md", devTask("subtask-a", "req-terminal"));
    await writeText(projectRoot, "docs/03_开发计划/nested/subtask-b-开发任务.md", devTask("subtask-b", "req-terminal"));
    await writeText(projectRoot, "docs/03_开发计划/subtask-cancelled-开发任务.md", devTask("subtask-cancelled", "req-terminal", {
      status: "cancelled",
      current_node: "archive",
      review_status: "failed"
    }));
    await writeText(projectRoot, "docs/03_开发计划/subtask-other-开发任务.md", devTask("subtask-other", "req-other", {
      status: "reviewing",
      current_node: "review"
    }));

    const ok = await runEvidenceCheck(projectRoot, {
      check_id: "dev_task_requirement_terminal",
      params: { requirement_id: "req-terminal" }
    });
    assert.equal(ok.ok, true);
    assert.equal(ok.task_count, 2);
    assert.equal(ok.cancelled_count, 1);

    await writeText(projectRoot, "docs/03_开发计划/subtask-incomplete-开发任务.md", devTask("subtask-incomplete", "req-terminal", {
      status: "reviewing",
      current_node: "review"
    }));
    const incomplete = await runEvidenceCheck(projectRoot, {
      check_id: "dev_task_requirement_terminal",
      params: { requirement_id: "req-terminal" }
    });
    assert.equal(incomplete.ok, false);
    assert.match(incomplete.reason, /current_node is not archive/);

    const none = await runEvidenceCheck(projectRoot, {
      check_id: "dev_task_requirement_terminal",
      params: { requirement_id: "req-missing" }
    });
    assert.equal(none.ok, false);
    assert.match(none.reason, /no non-cancelled/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("validateEvidenceSet rejects missing required evidence and self-reference", async () => {
  const projectRoot = await tempProject();
  try {
    const policy = {
      evidence_required: {
        mode: "all",
        items: [{ kind: "A", source: "event_journal", check_id: "journal_event_exists" }]
      },
      guards: ["no_self_referential_event"]
    };

    const missing = await validateEvidenceSet({
      projectRoot,
      policy,
      evidence: [],
      outcomeId: "outcome-1"
    });
    assert.equal(missing.ok, false);
    assert.match(missing.issues.join("\n"), /missing required evidence/);

    const self = await validateEvidenceSet({
      projectRoot,
      policy,
      outcomeId: "outcome-1",
      evidence: [
        {
          kind: "A",
          ref: "capability-outcome:outcome-1:applied",
          check_id: "journal_event_exists",
          params: { idempotency_key: "capability-outcome:outcome-1:applied" }
        }
      ]
    });
    assert.equal(self.ok, false);
    assert.match(self.issues.join("\n"), /current outcome/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("must ask approval requires user approval for exact subject and ref", async () => {
  const subjectRef = { subject_type: "requirement", subject_id: "req-1" };
  const result = validateMustAskApprovals({
    policy: { must_ask_refs: ["must_ask_9"] },
    subjectRef,
    evidence: [
      {
        kind: "B",
        ref: "approval:approval-event-1",
        check_id: "journal_event_exists",
        params: {
          must_ask_ref: "must_ask_9",
          subject_ref: subjectRef,
          approved_by: "user"
        }
      }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(
    validateMustAskApprovals({ policy: { must_ask_refs: ["must_ask_9"] }, subjectRef, evidence: [] }).ok,
    false
  );
});
