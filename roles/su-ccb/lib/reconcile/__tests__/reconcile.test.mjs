import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { appendEvent, hashContent, LockTimeoutError } from "../../runtime/index.mjs";
import {
  applyApprovedActions,
  detectDrifts,
  generateReconcileReport,
  parseReconcileReportActions,
  runReconcileDetect
} from "../index.mjs";

async function tempProject() {
  const root = join(tmpdir(), `ccb-reconcile-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  return root;
}

async function cleanupProject(projectRoot) {
  await rm(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 20 });
}

async function writeText(projectRoot, relativePath, content) {
  const path = join(projectRoot, relativePath);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content, "utf8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFile(path, timeoutMs = 1000) {
  const startedAt = Date.now();
  while (true) {
    try {
      await readFile(path, "utf8");
      return;
    } catch (error) {
      if (error?.code !== "ENOENT" || Date.now() - startedAt >= timeoutMs) {
        throw error;
      }
      await sleep(5);
    }
  }
}

function validDevTask(input = {}) {
  const taskId = input.taskId ?? "subtask-abcdef123456";
  const dependencies = input.dependencies ?? "[]";
  return [
    "---",
    "doc_type: dev_task",
    `task_id: ${taskId}`,
    `title: ${input.title ?? "Valid Subtask"}`,
    `status: ${input.status ?? "reviewing"}`,
    `current_node: ${input.currentNode ?? "dispatch"}`,
    `node_substate: ${input.nodeSubstate ?? "awaiting_codex_pickup"}`,
    "priority: high",
    ...(input.reviewStatus ? [`review_status: ${input.reviewStatus}`] : []),
    `requirement_id: ${input.requirementId ?? "req-1"}`,
    `section_id: ${input.sectionId ?? "pr1-valid-subtask"}`,
    `order: ${input.order ?? 1}`,
    `implementation_owner: ${input.owner ?? "ccb_codex"}`,
    `dependencies: ${dependencies}`,
    "source_breakdown_draft: docs/.ccb/drafts/breakdown/req-1.json",
    `source_draft_hash: ${"a".repeat(64)}`,
    "created_at: 2026-05-22T10:00:00.000Z",
    "---",
    "",
    "## Valid Subtask",
    "",
    "- Implement the reconcile fixture behavior.",
    "- Keep enough markdown content for schema validation.",
    ""
  ].join("\n");
}

function devTaskPath(taskId) {
  return `docs/03_开发计划/${taskId}-开发任务.md`;
}

function consumedDraft() {
  return {
    schema_version: "breakdown-draft-v0.2",
    status: "consumed",
    project_id: "project-1",
    requirement_id: "req-1",
    carrier_task_id: "req-1",
    carrier_task_key: "Requirement 1",
    base_task_revision: null,
    generated_at: "2026-05-22T10:00:00.000Z",
    updated_at: "2026-05-22T10:00:00.000Z",
    generated_by: "ai_session",
    generation_source: { cc_agent: "ccb_claude", cx_agent: "ccb_codex" },
    plan: {
      title: "Requirement 1",
      summary: "Reconcile fixture",
      spec_outline_md: "## Outline\n\n- Enough detail for a valid draft.",
      estimated_total_days: 1
    },
    subtasks: [
      {
        section_id: "pr1-valid-subtask",
        order: 1,
        title: "Valid Subtask",
        summary: "Present file",
        spec_section_md: "## Valid\n\n- Already materialized.",
        priority: "high",
        implementation_owner: "ccb_codex",
        dependencies: [],
        include: true
      },
      {
        section_id: "pr2-missing-subtask",
        order: 2,
        title: "Missing Subtask",
        summary: "Should have a file",
        spec_section_md: "## Missing\n\n- This file is absent.",
        priority: "medium",
        implementation_owner: "claude",
        dependencies: ["pr1-valid-subtask"],
        include: true
      }
    ],
    review_history: [{ at: "2026-05-22T10:00:00.000Z", actor: "ai", action: "created" }],
    consumed_from_hash: "b".repeat(64)
  };
}

async function readEvents(projectRoot) {
  const content = await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8");
  return content.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function seedDriftDetectedEvent(projectRoot, now, action) {
  await appendEvent(
    {
      type: "drift_detected",
      subject_type: action.subject_type,
      subject_id: action.subject_id,
      payload: action,
      idempotency_key: `drift-detected:${now}:${action.id}`,
      emitted_at: now,
      source_actor: "ccb_claude"
    },
    { projectRoot }
  );
}

test("detectDrifts reports the Phase 3 minimum drift categories", async () => {
  const projectRoot = await tempProject();
  try {
    const subtaskPath = devTaskPath("subtask-abcdef123456");
    const subtaskContent = validDevTask();
    await writeText(projectRoot, subtaskPath, subtaskContent);
    await writeText(
      projectRoot,
      devTaskPath("subtask-fedcba654321"),
      validDevTask({
        taskId: "subtask-fedcba654321",
        sectionId: "pr3-dependent-subtask",
        order: 3,
        dependencies: "[subtask-missing999]"
      })
    );
    await writeText(
      projectRoot,
      "docs/.ccb/drafts/breakdown/req-1.json",
      `${JSON.stringify(consumedDraft(), null, 2)}\n`
    );

    const drifts = await detectDrifts({
      projectRoot,
      projectionSnapshot: {
        documents: [
          {
            path: subtaskPath,
            contentHash: hashContent("stale db hash"),
            parseStatus: "partial",
            parseError: "dev-task.section_id invalid"
          }
        ],
        tasks: [
          { taskKey: "subtask-abcdef123456", specPath: subtaskPath },
          { taskKey: "stale-task", specPath: devTaskPath("stale-task") }
        ],
        driftTasks: [
          {
            category: "archived_spec_active_task",
            subjectType: "subtask",
            subjectId: "task-1",
            taskKey: "task-1",
            title: "Archived spec but active task",
            spec_path: subtaskPath,
            suggested_repair: { type: "quick_archive", reason: "archive path is canonical" }
          }
        ],
        statusRepairCandidates: [
          {
            subjectType: "requirement",
            subjectId: "req-1",
            taskKey: "Req One",
            title: "Req One",
            type: "rollup_requirement",
            reason: "requirement rollup projection differs"
          }
        ]
      }
    });

    const categories = new Set(drifts.map((drift) => drift.category));
    assert.ok(categories.has("file_db_projection_mismatch"));
    assert.ok(categories.has("parse_status_issue"));
    assert.ok(categories.has("orphan_projection"));
    assert.ok(categories.has("orphan_file"));
    assert.ok(categories.has("consumed_draft_missing_subtask"));
    assert.ok(categories.has("subtask_dependency_missing"));
    assert.ok(categories.has("known_console_drift"));
    assert.ok(categories.has("status_repair_migration"));
    assert.ok(drifts.every((drift) => ["auto", "approve", "forbid"].includes(drift.repair_level)));
  } finally {
    await cleanupProject(projectRoot);
  }
});

test("detectDrifts reports pending_state_write_intent", async () => {
  const projectRoot = await tempProject();
  try {
    await writeText(
      projectRoot,
      "docs/.ccb/events/journal.jsonl",
      `${JSON.stringify({
        type: "state_write_intent",
        subject_type: "subtask",
        subject_id: "subtask-111111111111",
        payload: {
          run_id: "run-pending",
          target_path: devTaskPath("subtask-111111111111"),
          resource_type: "dev_task",
          operation: "writeDevTaskState"
        },
        idempotency_key: "state-write:run-pending:intent",
        emitted_at: "2026-05-22T10:00:00.000Z",
        source_actor: "ccb_claude"
      })}\n`
    );

    const drifts = await detectDrifts({ projectRoot, projectionSnapshot: {} });
    const pending = drifts.find((item) => item.category === "pending_state_write_intent");

    assert.ok(pending);
    assert.equal(pending.severity, "high");
    assert.equal(pending.repair_level, "approve");
    assert.equal(pending.detail.run_id, "run-pending");
    assert.equal(pending.detail.terminal_event, "missing");
    assert.equal(pending.suggested_action.type, "manual_review");
  } finally {
    await cleanupProject(projectRoot);
  }
});

test("detectDrifts reports state_write_conflict", async () => {
  const projectRoot = await tempProject();
  try {
    await writeText(
      projectRoot,
      "docs/.ccb/events/journal.jsonl",
      `${JSON.stringify({
        type: "state_write_conflict",
        subject_type: "subtask",
        subject_id: "subtask-222222222222",
        payload: {
          run_id: "run-conflict",
          target_path: devTaskPath("subtask-222222222222"),
          resource_type: "dev_task",
          expected_hash: "a",
          actual_hash: "b",
          primitive: "safeWriteFile"
        },
        idempotency_key: "state-write:run-conflict:conflict",
        emitted_at: "2026-05-22T10:01:00.000Z",
        source_actor: "ccb_claude"
      })}\n`
    );

    const drifts = await detectDrifts({ projectRoot, projectionSnapshot: {} });
    const conflict = drifts.find((item) => item.category === "state_write_conflict");

    assert.ok(conflict);
    assert.equal(conflict.severity, "high");
    assert.equal(conflict.repair_level, "approve");
    assert.equal(conflict.detail.run_id, "run-conflict");
    assert.equal(conflict.detail.terminal_event, "conflict");
    assert.equal(conflict.suggested_action.reason, "CAS conflict requires AI/user reconciliation");
  } finally {
    await cleanupProject(projectRoot);
  }
});

test("runReconcileDetect writes journal recovery drifts into report", async () => {
  const projectRoot = await tempProject();
  try {
    await writeText(
      projectRoot,
      "docs/.ccb/events/journal.jsonl",
      [
        JSON.stringify({
          type: "state_write_intent",
          subject_type: "subtask",
          subject_id: "subtask-333333333333",
          payload: {
            run_id: "run-report-pending",
            target_path: devTaskPath("subtask-333333333333"),
            resource_type: "dev_task",
            operation: "writeDevTaskState"
          },
          idempotency_key: "state-write:run-report-pending:intent",
          emitted_at: "2026-05-22T10:02:00.000Z",
          source_actor: "ccb_claude"
        }),
        JSON.stringify({
          type: "state_write_conflict",
          subject_type: "subtask",
          subject_id: "subtask-444444444444",
          payload: {
            run_id: "run-report-conflict",
            target_path: devTaskPath("subtask-444444444444"),
            resource_type: "dev_task",
            expected_hash: "a",
            actual_hash: "b",
            primitive: "safeWriteFile"
          },
          idempotency_key: "state-write:run-report-conflict:conflict",
          emitted_at: "2026-05-22T10:03:00.000Z",
          source_actor: "ccb_claude"
        })
      ].join("\n") + "\n"
    );

    const result = await runReconcileDetect({
      projectRoot,
      scope: { type: "project" },
      projectionSnapshot: {},
      now: "2026-05-22T12:10:00.000Z"
    });
    const report = await readFile(join(projectRoot, result.reportPath), "utf8");
    const categories = new Set(result.drifts.map((item) => item.category));

    assert.ok(categories.has("pending_state_write_intent"));
    assert.ok(categories.has("state_write_conflict"));
    assert.match(report, /run_id: run-report-pending/);
    assert.match(report, /target_path: docs\/03_开发计划\/subtask-333333333333-开发任务\.md/);
    assert.match(report, /terminal_event: missing/);
    assert.match(report, /state_write_conflict/);
    assert.match(report, /terminal_event: conflict/);
  } finally {
    await cleanupProject(projectRoot);
  }
});

test("runReconcileDetect writes report and EventJournal events", async () => {
  const projectRoot = await tempProject();
  try {
    const subtaskPath = devTaskPath("subtask-abcdef123456");
    await writeText(projectRoot, subtaskPath, validDevTask());

    const result = await runReconcileDetect({
      projectRoot,
      scope: { type: "project" },
      projectionSnapshot: {
        documents: [{ path: subtaskPath, contentHash: "0".repeat(64) }]
      },
      now: "2026-05-22T12:00:00.000Z"
    });

    assert.match(result.reportPath, /docs\/\.ccb\/drafts\/reconcile\/2026-05\/reconcile-20260522T120000000Z\.md$/);
    const report = await readFile(join(projectRoot, result.reportPath), "utf8");
    assert.match(report, /# Reconcile Report/);
    assert.match(report, /file_db_projection_mismatch/);
    assert.match(report, /- \[ \] `rec-/);
    assert.ok(parseReconcileReportActions(report).length >= 1);

    const events = await readEvents(projectRoot);
    assert.equal(events.filter((event) => event.type === "reconcile_started").length, 1);
    assert.equal(events.filter((event) => event.type === "drift_detected").length, result.drifts.length);
    assert.equal(events.filter((event) => event.type === "reconcile_completed").length, 1);
    assert.equal("slot_health" in events.find((event) => event.type === "reconcile_completed").payload, false);
  } finally {
    await cleanupProject(projectRoot);
  }
});

test("runReconcileDetect can optionally run slot stale health check", async () => {
  const projectRoot = await tempProject();
  try {
    await writeText(
      projectRoot,
      "docs/02_需求设计/req-reconcile-slot-health.md",
      [
        "---",
        "id: req-reconcile-slot-health",
        "title: Reconcile Slot Health",
        "doc_type: requirement",
        "status: planning",
        "---",
        "",
        "# Reconcile Slot Health",
        ""
      ].join("\n")
    );
    await appendEvent(
      {
        type: "capability_outcome_applied",
        subject_type: "requirement",
        subject_id: "req-reconcile-slot-health",
        payload: {
          outcome_id: "outcome-reconcile-slot-health",
          policy_id: "requirement.analysis.completed",
          capability_id: "requirement.analysis",
          outcome_type: "passed"
        },
        idempotency_key: "capability-outcome:outcome-reconcile-slot-health:applied",
        emitted_at: "2026-05-01T00:00:00.000Z",
        source_actor: "ccb_claude"
      },
      { projectRoot }
    );

    const result = await runReconcileDetect({
      projectRoot,
      scope: { type: "project" },
      projectionSnapshot: {},
      now: "2026-05-10T00:00:00.000Z",
      includeSlotHealth: true
    });

    assert.equal(result.slotHealth.staleAppended, 1);
    const events = await readEvents(projectRoot);
    assert.equal(events.filter((event) => event.type === "slot_stale").length, 1);
    assert.equal(
      events.find((event) => event.type === "reconcile_completed").payload.slot_health.staleAppended,
      1
    );
  } finally {
    await cleanupProject(projectRoot);
  }
});

test("runReconcileDetect uses a project-level lock", async () => {
  const projectRoot = await tempProject();
  try {
    const first = runReconcileDetect({
      projectRoot,
      projectionSnapshot: {},
      lockOptions: { holdMs: 75, timeoutMs: 200, retryIntervalMs: 5 }
    });
    await waitForFile(join(projectRoot, "docs", ".ccb", "locks", "reconcile.lock", "owner.json"));
    await assert.rejects(
      () => runReconcileDetect({ projectRoot, projectionSnapshot: {}, lockOptions: { timeoutMs: 25, retryIntervalMs: 5 } }),
      LockTimeoutError
    );
    await first;
  } finally {
    await cleanupProject(projectRoot);
  }
});

test("applyApprovedActions enforces auto, approve, and forbid repair levels", async () => {
  const projectRoot = await tempProject();
  try {
    const specPath = devTaskPath("subtask-abcdef123456");
    await writeText(projectRoot, specPath, validDevTask());
    const report = await generateReconcileReport({
      projectRoot,
      scope: { type: "project" },
      now: "2026-05-22T12:00:00.000Z",
      drifts: [
        {
          id: "rec-auto",
          category: "file_db_projection_mismatch",
          severity: "medium",
          subject_type: "project",
          subject_id: "project",
          title: "Projection refresh",
          detail: {},
          suggested_action: { type: "refresh_projection", reason: "projection stale" },
          repair_level: "auto"
        },
        {
          id: "rec-approve",
          category: "status_repair_migration",
          severity: "medium",
          subject_type: "subtask",
          subject_id: "subtask-abcdef123456",
          title: "Set status",
          detail: { path: specPath },
          suggested_action: { type: "set_status", payload: { status: "done" }, reason: "done in evidence" },
          repair_level: "approve"
        },
        {
          id: "rec-forbid",
          category: "manual_conflict",
          severity: "high",
          subject_type: "project",
          subject_id: "project",
          title: "Forbidden reset",
          detail: {},
          suggested_action: { type: "git_reset", reason: "never do this" },
          repair_level: "forbid"
        }
      ]
    });
    const actions = parseReconcileReportActions(await readFile(join(projectRoot, report.reportPath), "utf8"));
    await seedDriftDetectedEvent(projectRoot, "2026-05-22T12:00:00.000Z", actions.find((item) => item.id === "rec-approve"));

    await assert.rejects(
      () => applyApprovedActions({ projectRoot, reportPath: report.reportPath, approvedActionIds: [] }),
      /require approval/
    );
    await assert.rejects(
      () => applyApprovedActions({ projectRoot, reportPath: report.reportPath, approvedActionIds: ["rec-forbid"] }),
      /forbidden/
    );

    const applied = await applyApprovedActions({
      projectRoot,
      reportPath: report.reportPath,
      approvedActionIds: ["rec-approve"]
    });
    assert.deepEqual(applied.applied.map((item) => item.id).sort(), ["rec-approve", "rec-auto"].sort());
    assert.match(await readFile(join(projectRoot, specPath), "utf8"), /status: done/);

    const events = await readEvents(projectRoot);
    assert.equal(events.filter((event) => event.type === "capability_outcome_applied").length, 1);
    assert.equal(events.filter((event) => event.type === "state_reconciled").length, 2);
  } finally {
    await cleanupProject(projectRoot);
  }
});

test("applyApprovedActions forwards quick_archive to capability outcome", async () => {
  const projectRoot = await tempProject();
  try {
    const specPath = devTaskPath("subtask-abcdef123456");
    await writeText(
      projectRoot,
      specPath,
      validDevTask({ status: "done", currentNode: "archive", nodeSubstate: "archived", reviewStatus: "passed" })
    );
    const report = await generateReconcileReport({
      projectRoot,
      scope: { type: "project" },
      now: "2026-05-22T12:20:00.000Z",
      drifts: [
        {
          id: "rec-quick",
          category: "known_console_drift",
          severity: "medium",
          subject_type: "subtask",
          subject_id: "subtask-abcdef123456",
          title: "Quick archive",
          detail: { path: specPath },
          suggested_action: { type: "quick_archive", reason: "archive path is canonical" },
          repair_level: "approve"
        }
      ]
    });

    const applied = await applyApprovedActions({
      projectRoot,
      reportPath: report.reportPath,
      approvedActionIds: ["rec-quick"]
    });

    assert.deepEqual(applied.applied.map((item) => item.id), ["rec-quick"]);
    const state = await readFile(join(projectRoot, specPath), "utf8");
    assert.match(state, /status: done/);
    assert.match(state, /current_node: archive/);
    assert.match(state, /node_substate: archived/);
    const events = await readEvents(projectRoot);
    assert.equal(events.filter((event) => event.type === "capability_outcome_applied").length, 1);
  } finally {
    await cleanupProject(projectRoot);
  }
});
