import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const skillPath = join(dirname(fileURLToPath(import.meta.url)), "..", "SKILL.md");

test("su-archive documents requirement manual archive cleanup plus finalize", async () => {
  const content = await readFile(skillPath, "utf8");

  assert.match(content, /\/ccb:su-archive requirement_id=<requirementId>/);
  assert.match(content, /需求级手动归档入口/);
  assert.match(content, /cleanupRequirementWorktree/);
  assert.match(content, /dev_task_requirement_terminal/);
  assert.match(content, /finalize-only recovery/);
  assert.match(content, /archived \+ requirement 仍非 delivered/);
  assert.doesNotMatch(content, /archiveRequirementWorktree/);
});

test("su-archive documents explicit reopen entry for merged worktrees", async () => {
  const content = await readFile(skillPath, "utf8");

  assert.match(content, /\/ccb:su-archive --reopen requirement_id=<requirementId>/);
  assert.match(content, /reopenRequirementWorktree/);
  assert.match(content, /只处理 `merged→ready`/);
  assert.match(content, /worktree\+分支仍存在且 worktree clean/);
});
