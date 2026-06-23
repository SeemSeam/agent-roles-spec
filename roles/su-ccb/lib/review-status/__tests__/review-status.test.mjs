import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { DEFAULT_CONTRACT_PATH } from "../../docs-structure/index.mjs";
import { ValidationError } from "../../runtime/index.mjs";
import { writeDevTaskReviewStatus } from "../index.mjs";

async function tempProject() {
  const root = join(tmpdir(), `ccb-review-status-${randomUUID()}`);
  await mkdir(join(root, "docs", "03_开发计划"), { recursive: true });
  return root;
}

function devTaskMarkdown(taskId = "subtask-abcdef123456") {
  return [
    "---",
    "doc_type: dev_task",
    `task_id: ${taskId}`,
    "title: Reviewable Dev Task",
    "status: reviewing",
    "current_node: review",
    "node_substate: awaiting_review_result",
    "priority: medium",
    "requirement_id: req-review",
    "section_id: pr1-review-status",
    "order: 1",
    "implementation_owner: ccb_codex",
    "dependencies: []",
    "source_breakdown_draft: docs/.ccb/drafts/breakdown/req-review.json",
    `source_draft_hash: ${"a".repeat(64)}`,
    "created_at: 2026-05-28T10:00:00.000Z",
    "---",
    "",
    "# Reviewable Dev Task",
    "",
    "- Keep enough body content so dev_task schema validation succeeds.",
    "- The review helper should update only frontmatter review_status.",
    ""
  ].join("\n");
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

test("writeDevTaskReviewStatus writes passed into dev_task frontmatter with audited CAS", async () => {
  const projectRoot = await tempProject();
  try {
    const path = join(projectRoot, "docs", "03_开发计划", "reviewable-开发任务.md");
    await writeFile(path, devTaskMarkdown(), "utf8");

    const result = await writeDevTaskReviewStatus({
      projectRoot,
      taskId: "subtask-abcdef123456",
      reviewStatus: "passed"
    });

    assert.equal(result.path, "docs/03_开发计划/reviewable-开发任务.md");
    const content = await readFile(path, "utf8");
    assert.match(content, /^review_status: passed$/m);
    assert.doesNotMatch(content, /^schema_version:/m);
    assert.doesNotMatch(content, /^kind:/m);

    const journal = await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8");
    assert.match(journal, /writeDevTaskReviewStatus/);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("writeDevTaskReviewStatus resolves dev_task through project-local contract when present", async () => {
  const projectRoot = await tempProject();
  try {
    await writeProjectContract(projectRoot, "03_review_tasks/");
    const path = join(projectRoot, "docs", "03_review_tasks", "reviewable-开发任务.md");
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, devTaskMarkdown("subtask-abcdef654321"), "utf8");

    const result = await writeDevTaskReviewStatus({
      projectRoot,
      taskId: "subtask-abcdef654321",
      reviewStatus: "passed"
    });

    assert.equal(result.path, "docs/03_review_tasks/reviewable-开发任务.md");
    assert.match(await readFile(path, "utf8"), /^review_status: passed$/m);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test("writeDevTaskReviewStatus rejects non pass/fail review values", async () => {
  await assert.rejects(
    () =>
      writeDevTaskReviewStatus({
        projectRoot: "/tmp/missing-project",
        taskId: "subtask-abcdef123456",
        reviewStatus: "needs_followup"
      }),
    ValidationError
  );
});
