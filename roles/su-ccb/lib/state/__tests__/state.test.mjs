import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { ConflictError, ValidationError } from "../../runtime/index.mjs";
import {
  readTaskState,
  renderTaskState,
  validateTaskStateBusinessRules,
  writeTaskState
} from "../index.mjs";

async function tempProject() {
  const root = join(tmpdir(), `ccb-dev-task-state-${randomUUID()}`);
  await mkdir(root, { recursive: true });
  return root;
}

function devTask(taskId = "subtask-abcdef123456", overrides = {}) {
  return [
    "---",
    "doc_type: dev_task",
    `task_id: ${taskId}`,
    `title: ${overrides.title ?? "Stateful dev task"}`,
    `status: ${overrides.status ?? "reviewing"}`,
    `current_node: ${overrides.current_node ?? "dispatch"}`,
    `node_substate: ${overrides.node_substate ?? "awaiting_codex_pickup"}`,
    ...(overrides.review_status ? [`review_status: ${overrides.review_status}`] : []),
    "priority: medium",
    "requirement_id: req-1",
    "section_id: pr1-dev-task-frontmatter",
    "order: 1",
    "implementation_owner: ccb_codex",
    "dependencies: []",
    "source_breakdown_draft: docs/.ccb/drafts/breakdown/req-1.json",
    `source_draft_hash: ${"a".repeat(64)}`,
    "created_at: 2026-05-22T10:00:00.000Z",
    "---",
    "",
    "# Stateful dev task",
    "",
    "- This dev task body is long enough for runtime schema validation.",
    "- State is stored in frontmatter, not in docs/.ccb state files.",
    ""
  ].join("\n");
}

async function writeDevTaskFile(projectRoot, fileName, taskId = "subtask-abcdef123456", overrides = {}) {
  const path = join(projectRoot, "docs", "03_开发计划", fileName);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, devTask(taskId, overrides), "utf8");
  return path;
}

async function writeDevTask(projectRoot, taskId = "subtask-abcdef123456", overrides = {}) {
  return await writeDevTaskFile(projectRoot, `${taskId}-开发任务.md`, taskId, overrides);
}

async function writeDocumentMap(projectRoot, documents) {
  const path = join(projectRoot, "docs", ".ccb", "index", "document-map.json");
  const devTaskPathsByTaskId = {};
  for (const document of documents) {
    if (document.docType !== "dev_task" || !document.task_id) continue;
    devTaskPathsByTaskId[document.task_id] = [...(devTaskPathsByTaskId[document.task_id] ?? []), document.path];
  }
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(
    path,
    `${JSON.stringify(
      {
        schema_version: "document-map-index-v0.1",
        generated_at: "2026-05-22T10:01:00.000Z",
        source: "indexer",
        dev_task_paths_by_task_id: devTaskPathsByTaskId,
        documents
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  return path;
}

test("validateTaskStateBusinessRules accepts dev_task frontmatter", () => {
  validateTaskStateBusinessRules({
    doc_type: "dev_task",
    task_id: "subtask-abcdef123456",
    status: "reviewing",
    current_node: "implementation",
    node_substate: "in_progress"
  });
});

test("validateTaskStateBusinessRules rejects invalid dev_task state", () => {
  assert.throws(
    () =>
      validateTaskStateBusinessRules({
        doc_type: "wrong",
        task_id: "",
        status: "archived",
        current_node: "bad-node",
        node_substate: "",
        review_status: "approved"
      }),
    (error) => {
      assert.ok(error instanceof ValidationError);
      assert.match(error.message, /doc_type/);
      assert.match(error.message, /review_status/);
      return true;
    }
  );
});

test("writeTaskState updates existing dev_task frontmatter through CAS", async () => {
  const projectRoot = await tempProject();
  try {
    const path = await writeDevTask(projectRoot);
    const initial = await readTaskState({ projectRoot, taskId: "subtask-abcdef123456" });
    const updated = await writeTaskState({
      projectRoot,
      taskId: "subtask-abcdef123456",
      patch: {
        status: "done",
        current_node: "archive",
        node_substate: "archived"
      },
      expectedHash: initial.hash,
      now: "2026-05-22T10:10:00.000Z"
    });

    assert.equal(updated.path, path);
    assert.equal(updated.frontmatter.status, "done");
    assert.equal(updated.frontmatter.current_node, "archive");
    assert.equal(updated.frontmatter.node_substate, "archived");
    assert.match(await readFile(path, "utf8"), /updated_by: reconcile/);

    await assert.rejects(
      () =>
        writeTaskState({
          projectRoot,
          taskId: "subtask-abcdef123456",
          patch: { status: "reviewing" },
          expectedHash: initial.hash,
          now: "2026-05-22T10:20:00.000Z"
        }),
      ConflictError
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("readTaskState resolves dev_task through document-map cache", async () => {
  const projectRoot = await tempProject();
  try {
    await writeDevTask(projectRoot, "subtask-cachehit123");
    await writeDocumentMap(projectRoot, [
      {
        path: "docs/03_开发计划/subtask-cachehit123-开发任务.md",
        docType: "dev_task",
        task_id: "subtask-cachehit123"
      }
    ]);

    const state = await readTaskState({ projectRoot, taskId: "subtask-cachehit123" });

    assert.equal(state.frontmatter.task_id, "subtask-cachehit123");
    assert.match(state.path, /subtask-cachehit123-开发任务\.md$/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("readTaskState falls back to scan when document-map cache entry is stale", async () => {
  const projectRoot = await tempProject();
  try {
    await writeDevTask(projectRoot, "subtask-fallback123");
    await writeDocumentMap(projectRoot, [
      {
        path: "docs/03_开发计划/missing-开发任务.md",
        docType: "dev_task",
        task_id: "subtask-fallback123"
      }
    ]);

    const state = await readTaskState({ projectRoot, taskId: "subtask-fallback123" });

    assert.equal(state.frontmatter.task_id, "subtask-fallback123");
    assert.match(state.path, /subtask-fallback123-开发任务\.md$/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("readTaskState reports duplicate task ids from document-map cache", async () => {
  const projectRoot = await tempProject();
  try {
    await writeDevTaskFile(projectRoot, "first-开发任务.md", "subtask-duplicate123");
    await writeDevTaskFile(projectRoot, "second-开发任务.md", "subtask-duplicate123");
    await writeDocumentMap(projectRoot, [
      {
        path: "docs/03_开发计划/first-开发任务.md",
        docType: "dev_task",
        task_id: "subtask-duplicate123"
      },
      {
        path: "docs/03_开发计划/second-开发任务.md",
        docType: "dev_task",
        task_id: "subtask-duplicate123"
      }
    ]);

    await assert.rejects(
      () => readTaskState({ projectRoot, taskId: "subtask-duplicate123" }),
      ConflictError
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("writeTaskState persists review_status in dev_task frontmatter", async () => {
  const projectRoot = await tempProject();
  try {
    const path = await writeDevTask(projectRoot);
    const current = await readTaskState({ projectRoot, taskId: "subtask-abcdef123456" });
    const updated = await writeTaskState({
      projectRoot,
      taskId: "subtask-abcdef123456",
      patch: {
        status: "done",
        current_node: "archive",
        node_substate: "archived",
        review_status: "passed"
      },
      expectedHash: current.hash,
      now: "2026-05-25T16:11:50.000Z"
    });

    assert.equal(updated.frontmatter.review_status, "passed");
    assert.match(await readFile(path, "utf8"), /review_status: passed/);
    const readBack = await readTaskState({ projectRoot, taskId: "subtask-abcdef123456" });
    assert.equal(readBack.frontmatter.review_status, "passed");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("writeTaskState emits audited dev_task write events", async () => {
  const projectRoot = await tempProject();
  try {
    await writeDevTask(projectRoot, "subtask-aaaabbbb1111");
    const current = await readTaskState({ projectRoot, taskId: "subtask-aaaabbbb1111" });
    await writeTaskState({
      projectRoot,
      taskId: "subtask-aaaabbbb1111",
      patch: { node_substate: "in_progress" },
      expectedHash: current.hash,
      now: "2026-05-22T10:00:00.000Z",
      updatedBy: "ai_session",
      audit: { runId: "dev-task-state-run-1" }
    });

    const events = (await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8"))
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    assert.deepEqual(events.map((event) => event.type), ["state_write_intent", "state_write_done"]);
    assert.equal(events[0].subject_type, "subtask");
    assert.equal(events[0].subject_id, "subtask-aaaabbbb1111");
    assert.equal(events[0].payload.resource_type, "dev_task");
    assert.equal(events[0].payload.operation, "writeDevTaskState");
    assert.deepEqual(events[0].payload.planned_diff.node_substate, "in_progress");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("writeTaskState CAS conflict emits dev_task write conflict", async () => {
  const projectRoot = await tempProject();
  try {
    const path = await writeDevTask(projectRoot, "subtask-aaaabbbb2222");
    const current = await readTaskState({ projectRoot, taskId: "subtask-aaaabbbb2222" });
    await writeTaskState({
      projectRoot,
      taskId: "subtask-aaaabbbb2222",
      patch: { node_substate: "first_update" },
      expectedHash: current.hash,
      now: "2026-05-22T10:05:00.000Z",
      audit: { runId: "dev-task-state-update" }
    });

    await assert.rejects(
      () =>
        writeTaskState({
          projectRoot,
          taskId: "subtask-aaaabbbb2222",
          patch: { node_substate: "stale_update" },
          expectedHash: current.hash,
          now: "2026-05-22T10:10:00.000Z",
          audit: { runId: "dev-task-state-conflict" }
        }),
      ConflictError
    );

    assert.match(await readFile(path, "utf8"), /node_substate: first_update/);
    const events = (await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8"))
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    const conflict = events.find((event) => event.type === "state_write_conflict" && event.payload.run_id === "dev-task-state-conflict");
    assert.ok(conflict);
    assert.equal(conflict.payload.resource_type, "dev_task");
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("renderTaskState renders a pure dev_task document", () => {
  const content = renderTaskState({
    taskId: "subtask-abcdef123456",
    title: "Rendered dev task",
    status: "done",
    current_node: "archive",
    node_substate: "archived",
    review_status: "passed",
    requirement_id: "req-1",
    section_id: "pr1-rendered-dev-task",
    source_draft_hash: "a".repeat(64),
    created_at: "2026-05-22T10:00:00.000Z"
  });

  assert.match(content, /doc_type: dev_task/);
  assert.match(content, /status: done/);
  assert.doesNotMatch(content, /schema_version:/);
});

test("readTaskState ignores missing dev_task instead of reading docs ccb state", async () => {
  const projectRoot = await tempProject();
  try {
    const state = await readTaskState({ projectRoot, taskId: "subtask-abcdef123456" });
    assert.equal(state, null);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});
