import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const skillPath = join(dirname(fileURLToPath(import.meta.url)), "..", "SKILL.md");

test("su-quick-archive forbids subtask-level worktree cleanup and delegates requirement archive", async () => {
  const content = await readFile(skillPath, "utf8");

  assert.match(content, /快速归档子任务不得执行 worktree 生命周期收尾/);
  assert.match(content, /不得调用\s+`archiveRequirementWorktree`、`cleanupRequirementWorktree` 或 `requirement\.finalize`/);
  assert.match(content, /`mergeRequirementWorktree\(\)` 进入 `merged` 预览暂停/);
  assert.match(content, /\/ccb:su-archive requirement_id=<id>/);
});
