import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  createBreakdownDraft,
  deriveFollowupBreakdownDraft,
  readBreakdownDraft,
  transitionBreakdownDraftStatus
} from "../../breakdown-draft/index.mjs";
import { DEFAULT_CONTRACT_PATH, resolveDocType } from "../../docs-structure/index.mjs";
import { ConflictError, IOError, ValidationError, validateAgainstSchema } from "../../runtime/index.mjs";
import { materializeRequirement, taskIdForSubtask } from "../index.mjs";
import { validateDevTaskBusinessRules } from "../business-rules.mjs";

async function tempProject() {
  const root = join(tmpdir(), `ccb-subtask-lib-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  return root;
}

function specSection(title) {
  return [
    `## ${title}`,
    "",
    "- Implement the requested slice with a clear input and output contract.",
    "- Cover the user-visible behavior and keep the change independently reviewable."
  ].join("\n");
}

function validDraft(input = {}) {
  const requirementId = input.requirementId ?? "req-1";
  const count = input.count ?? 3;
  const subtasks = Array.from({ length: count }, (_, index) => {
    const order = index + 1;
    return {
      section_id: `pr${order}-slice-${order}`,
      order,
      title: `Slice ${order}`,
      summary: `Deliver slice ${order}.`,
      spec_section_md: specSection(`Slice ${order}`),
      priority: order === 1 ? "high" : "medium",
      implementation_owner: order % 2 === 0 ? "claude" : "ccb_codex",
      dependencies: order === 1 ? [] : [`pr${order - 1}-slice-${order - 1}`],
      include: true
    };
  });
  return {
    schema_version: "breakdown-draft-v0.2",
    status: "draft",
    project_id: "project-1",
    requirement_id: requirementId,
    carrier_task_id: requirementId,
    carrier_task_key: "Materialize Requirement",
    base_task_revision: null,
    generated_at: "2026-05-22T10:00:00.000Z",
    updated_at: "2026-05-22T10:00:00.000Z",
    generated_by: "ai_session",
    generation_source: {
      cc_agent: "ccb_claude",
      cx_agent: "ccb_codex"
    },
    plan: {
      title: "Materialize Requirement",
      summary: "Materialize approved breakdown draft into dev_task documents.",
      spec_outline_md: specSection("Materialize Outline"),
      estimated_total_days: 2
    },
    subtasks,
    review_history: [
      {
        at: "2026-05-22T10:00:00.000Z",
        actor: "ai",
        action: "created"
      }
    ]
  };
}

async function createApprovedDraft(projectRoot, requirementId = "req-1", input = {}) {
  const created = await createBreakdownDraft({
    projectRoot,
    requirementId,
    draftPayload: validDraft({ requirementId, ...input })
  });
  const reviewing = await transitionBreakdownDraftStatus({
    projectRoot,
    requirementId,
    expectedHash: created.hash,
    fromStatus: "draft",
    toStatus: "reviewing"
  });
  return await transitionBreakdownDraftStatus({
    projectRoot,
    requirementId,
    expectedHash: reviewing.hash,
    fromStatus: "reviewing",
    toStatus: "approved",
    approvedBy: "user"
  });
}

async function readEvents(projectRoot) {
  const content = await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8");
  return content.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

async function writeProjectContract(projectRoot, replacementPath) {
  const contract = await readFile(DEFAULT_CONTRACT_PATH, "utf8");
  await mkdir(join(projectRoot, "docs", ".ccb"), { recursive: true });
  await writeFile(
    join(projectRoot, "docs", ".ccb", "docs-structure-contract.yaml"),
    contract.replace('path: "03_开发计划/"', `path: "${replacementPath}"`),
    "utf8"
  );
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function devTaskPath(projectRoot, title, taskId) {
  const resolved = await resolveDocType("dev_task");
  const subject = `${slugify(title) || "dev-task"}-${taskId.slice(-6)}`;
  const fileName = resolved.namingRule
    .replace("<模块/主题>", subject)
    .replace("<文档类型>", "开发任务")
    .replace("<部分>", subject)
    .replace("<模块>", subject);
  return join(projectRoot, resolved.directory, fileName.endsWith(".md") ? fileName : `${fileName}.md`);
}

test("materializeRequirement writes dev_task documents, consumes the draft, and appends journal events", async () => {
  const projectRoot = await tempProject();
  try {
    const approved = await createApprovedDraft(projectRoot);

    const result = await materializeRequirement({
      projectRoot,
      requirementId: "req-1",
      expectedDraftHash: approved.hash
    });

    assert.equal(result.requirementId, "req-1");
    assert.equal(result.draftHash, approved.hash);
    assert.equal(result.subtasks.length, 3);
    assert.equal(result.written.length, 3);
    assert.equal(result.skipped.length, 0);

    for (const subtask of result.subtasks) {
      assert.match(subtask.taskId, /^subtask-[a-f0-9]{12}$/);
      assert.match(subtask.path, /^docs\/03_开发计划\//);
      assert.match(subtask.path, /-开发任务\.md$/);
      const content = await readFile(join(projectRoot, subtask.path), "utf8");
      assert.doesNotMatch(content, /^schema_version:/m);
      assert.match(content, new RegExp(`task_id: ${subtask.taskId}`));
      assert.match(content, /doc_type: dev_task/);
      assert.doesNotMatch(content, /^kind:/m);
      assert.match(content, /status: reviewing/);
      assert.match(content, /current_node: dispatch/);
      assert.match(content, /node_substate: awaiting_codex_pickup/);
      assert.match(content, new RegExp(`section_id: ${subtask.sectionId}`));
      assert.match(content, new RegExp(`order: ${subtask.sectionId.match(/^pr(\d+)-/)?.[1]}`));
      assert.match(content, /source_draft_hash: [a-f0-9]{64}/);
      assert.match(content, /^## 一、任务概述$/m);
      assert.match(content, /^## 二、任务分解$/m);
      assert.match(content, /^### Slice \d+$/m);
      assert.doesNotMatch(content, /^## Slice \d+$/m);
      assert.match(content, /^## 三、执行顺序 \/ 里程碑$/m);
      assert.match(content, /^## 四、进度记录$/m);
      assert.match(content, /^## 五、验收标准$/m);
      assert.match(content, /^## 六、风险与注意$/m);
    }

    const consumed = await readBreakdownDraft({ projectRoot, requirementId: "req-1" });
    assert.equal(consumed.draft.status, "consumed");
    assert.equal(consumed.draft.consumed_by, "ccb_claude");

    const events = await readEvents(projectRoot);
    assert.equal(events.filter((event) => event.type === "subtask_materialized").length, 3);
    assert.equal(events.filter((event) => event.type === "requirement_materialized").length, 1);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("materializeRequirement resolves dev_task through project-local contract when present", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectContract(projectRoot, "03_custom_tasks/");
    const approved = await createApprovedDraft(projectRoot, "req-local-contract", { count: 1 });

    const result = await materializeRequirement({
      projectRoot,
      requirementId: "req-local-contract",
      expectedDraftHash: approved.hash
    });

    assert.equal(result.subtasks.length, 1);
    assert.match(result.subtasks[0].path, /^docs\/03_custom_tasks\//);
    assert.match(await readFile(join(projectRoot, result.subtasks[0].path), "utf8"), /doc_type: dev_task/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("taskIdForSubtask is deterministic and scoped by requirement", () => {
  assert.equal(taskIdForSubtask("req-1", "pr1-slice-1"), taskIdForSubtask("req-1", "pr1-slice-1"));
  assert.notEqual(taskIdForSubtask("req-1", "pr1-slice-1"), taskIdForSubtask("req-2", "pr1-slice-1"));
});

test("dev-task runtime schema accepts valid materialized markdown", async () => {
  const taskId = taskIdForSubtask("req-1", "pr1-slice-1");
  await validateAgainstSchema(
    [
      "---",
      "doc_type: dev_task",
      `task_id: ${taskId}`,
      "title: Slice 1",
      "status: reviewing",
      "current_node: dispatch",
      "node_substate: awaiting_codex_pickup",
      "priority: high",
      "requirement_id: req-1",
      "section_id: pr1-slice-1",
      "order: 1",
      "implementation_owner: ccb_codex",
      "dependencies: []",
      "source_breakdown_draft: docs/.ccb/drafts/breakdown/req-1.json",
      `source_draft_hash: ${"a".repeat(64)}`,
      "created_at: 2026-05-22T10:00:00.000Z",
      "---",
      "",
      "## Slice 1",
      "",
      "- Implement a valid materialized dev_task document.",
      "- Keep enough markdown body for runtime validation.",
      ""
    ].join("\n"),
    "dev-task"
  );
});

test("dev-task runtime schema validates metadata", async () => {
  const taskId = taskIdForSubtask("req-1", "pr1-slice-1");
  await assert.rejects(
    () =>
      validateAgainstSchema(
        [
          "---",
          "doc_type: technical_design",
          `task_id: ${taskId}`,
          "title: Slice 1",
          "status: active",
          "current_node: dispatch",
          "node_substate: awaiting_codex_pickup",
          "priority: high",
          "requirement_id: req-1",
          "section_id: pr1-slice-1",
          "order: 1",
          "implementation_owner: ccb_codex",
          "dependencies: []",
          "source_breakdown_draft: docs/.ccb/drafts/breakdown/req-1.json",
          `source_draft_hash: ${"a".repeat(64)}`,
          "created_at: 2026-05-22T10:00:00.000Z",
          "---",
          "",
          "## Slice 1",
          "",
          "- Implement a valid materialized dev_task document.",
          "- Keep enough markdown body for runtime validation.",
          ""
        ].join("\n"),
        "dev-task"
      ),
    ValidationError
  );
});

test("materializeRequirement rejects stale hashes and unapproved drafts without writing files", async () => {
  const projectRoot = await tempProject();
  try {
    await createApprovedDraft(projectRoot);
    await assert.rejects(
      () =>
        materializeRequirement({
          projectRoot,
          requirementId: "req-1",
          expectedDraftHash: "0".repeat(64)
        }),
      ConflictError
    );

    const draftOnly = await createBreakdownDraft({
      projectRoot,
      requirementId: "req-draft",
      draftPayload: validDraft({ requirementId: "req-draft" })
    });
    await assert.rejects(
      () =>
        materializeRequirement({
          projectRoot,
          requirementId: "req-draft",
          expectedDraftHash: draftOnly.hash
        }),
      ValidationError
    );

    const expectedPath = await devTaskPath(projectRoot, "Slice 1", taskIdForSubtask("req-draft", "pr1-slice-1"));
    await assert.rejects(() => readFile(expectedPath, "utf8"), /ENOENT/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("validateDevTaskBusinessRules aggregates actionable violations", () => {
  assert.throws(
    () =>
      validateDevTaskBusinessRules(
        {
          doc_type: "technical_design",
          task_id: "bad",
          title: "",
          status: "active",
          current_node: "dispatch",
          node_substate: "",
          priority: "urgent",
          requirement_id: "",
          section_id: "S1",
          order: 2,
          implementation_owner: "auto",
          dependencies: ["subtask-missing"],
          source_breakdown_draft: "",
          source_draft_hash: "bad",
          created_at: "2026-05-22"
        },
        "short body",
        { knownTaskIds: new Set() }
      ),
    (error) => {
      assert.ok(error instanceof ValidationError);
      assert.match(error.message, /task_id/);
      assert.match(error.message, /section_id/);
      assert.match(error.message, /implementation_owner/);
      assert.match(error.message, /dependencies\[0\]/);
      assert.match(error.message, /body/);
      assert.ok(error.issues.length >= 8);
      return true;
    }
  );
});

test("materializeRequirement is idempotent for the same consumed draft hash", async () => {
  const projectRoot = await tempProject();
  try {
    const approved = await createApprovedDraft(projectRoot);
    const first = await materializeRequirement({
      projectRoot,
      requirementId: "req-1",
      expectedDraftHash: approved.hash
    });
    const second = await materializeRequirement({
      projectRoot,
      requirementId: "req-1",
      expectedDraftHash: approved.hash
    });

    assert.equal(second.written.length, 0);
    assert.deepEqual(
      second.skipped.map((item) => item.taskId).sort(),
      first.subtasks.map((item) => item.taskId).sort()
    );
    const events = await readEvents(projectRoot);
    assert.equal(events.filter((event) => event.type === "requirement_materialized").length, 1);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("materializeRequirement skips existing dev_task documents from an earlier draft hash", async () => {
  const projectRoot = await tempProject();
  try {
    const approved = await createApprovedDraft(projectRoot);
    const taskId = taskIdForSubtask("req-1", "pr1-slice-1");
    const staleTaskPath = await devTaskPath(projectRoot, "Slice 1", taskId);
    await mkdir(join(staleTaskPath, ".."), { recursive: true });
    await writeFile(
      staleTaskPath,
      [
        "---",
        "doc_type: dev_task",
        `task_id: ${taskId}`,
        "title: Slice 1",
        "status: reviewing",
        "current_node: dispatch",
        "node_substate: awaiting_codex_pickup",
        "priority: high",
        "requirement_id: req-1",
        "section_id: pr1-slice-1",
        "order: 1",
        "implementation_owner: ccb_codex",
        "dependencies: []",
        "source_breakdown_draft: docs/.ccb/drafts/breakdown/req-1.json",
        `source_draft_hash: ${"0".repeat(64)}`,
        "created_at: 2026-05-22T10:00:00.000Z",
        "---",
        "",
        "# Slice 1",
        "",
        "## Existing stale spec",
        "",
        "- This file is valid markdown, but it belongs to an older breakdown draft hash.",
        "- Materialization must reject it instead of treating it as an idempotent retry.",
        ""
      ].join("\n")
    );

    const result = await materializeRequirement({
      projectRoot,
      requirementId: "req-1",
      expectedDraftHash: approved.hash
    });
    assert.equal(result.written.length, 2);
    assert.deepEqual(result.skipped, [{ taskId, path: staleTaskPath.slice(projectRoot.length + 1) }]);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("derive followup materialization reopens consumed draft and writes only the new dev_task", async () => {
  const projectRoot = await tempProject();
  try {
    const approved = await createApprovedDraft(projectRoot, "req-followup", { count: 1 });
    const first = await materializeRequirement({
      projectRoot,
      requirementId: "req-followup",
      expectedDraftHash: approved.hash
    });
    assert.equal(first.written.length, 1);

    const derived = await deriveFollowupBreakdownDraft({
      projectRoot,
      requirementId: "req-followup",
      followup: {
        type: "subtask",
        title: "Derived follow-up",
        description: "Implement the derived follow-up from review."
      },
      sourceTask: {
        id: "source-task-id",
        key: "source-task-key",
        title: "Source implementation task",
        currentNode: "review"
      }
    });
    const consumed = await transitionBreakdownDraftStatus({
      projectRoot,
      requirementId: "req-followup",
      expectedHash: derived.hash,
      fromStatus: "approved",
      toStatus: "consumed",
      approvedBy: "ccb_claude"
    });

    const result = await materializeRequirement({
      projectRoot,
      requirementId: "req-followup",
      expectedDraftHash: derived.materializeExpectedHash
    });

    assert.equal(consumed.draft.consumed_from_hash, derived.materializeExpectedHash);
    assert.equal(result.written.length, 1);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.subtasks.length, 2);
    assert.equal(result.written[0].taskId, taskIdForSubtask("req-followup", derived.appendedSubtask.section_id));

    const content = await readFile(join(projectRoot, result.written[0].path), "utf8");
    assert.match(content, /> 派生自:task source-task-id\(source-task-key\)/);
    assert.match(content, /source_draft_hash: [a-f0-9]{64}/);

    const finalDraft = await readBreakdownDraft({ projectRoot, requirementId: "req-followup" });
    assert.equal(finalDraft.draft.status, "consumed");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("materializeRequirement leaves written files for retry and keeps draft approved when a later write fails", async () => {
  const projectRoot = await tempProject();
  try {
    const approved = await createApprovedDraft(projectRoot);
    const firstTaskPath = await devTaskPath(projectRoot, "Slice 1", taskIdForSubtask("req-1", "pr1-slice-1"));
    const secondTaskPath = await devTaskPath(projectRoot, "Slice 2", taskIdForSubtask("req-1", "pr2-slice-2"));
    await mkdir(secondTaskPath, { recursive: true });

    await assert.rejects(
      () =>
        materializeRequirement({
          projectRoot,
          requirementId: "req-1",
          expectedDraftHash: approved.hash
        }),
      IOError
    );

    assert.match(await readFile(firstTaskPath, "utf8"), /task_id: subtask-/);
    const stillApproved = await readBreakdownDraft({ projectRoot, requirementId: "req-1" });
    assert.equal(stillApproved.draft.status, "approved");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("materializeRequirement performance baseline for N=5 and N=20", async () => {
  for (const [count, maxMs] of [[5, 1000], [20, 5000]]) {
    const projectRoot = await tempProject();
    try {
      const requirementId = `req-${count}`;
      const approved = await createApprovedDraft(projectRoot, requirementId, { count });
      const startedAt = performance.now();
      const result = await materializeRequirement({
        projectRoot,
        requirementId,
        expectedDraftHash: approved.hash
      });
      const elapsedMs = performance.now() - startedAt;
      assert.equal(result.subtasks.length, count);
      assert.ok(elapsedMs < maxMs, `N=${count} took ${elapsedMs}ms, expected < ${maxMs}ms`);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  }
});
