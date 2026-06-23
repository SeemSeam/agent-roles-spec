import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const skillPath = join(dirname(fileURLToPath(import.meta.url)), "..", "SKILL.md");

test("su-flow documents derive_followup reopen and materialization contract", async () => {
  const content = await readFile(skillPath, "utf8");

  assert.match(content, /`derive_followup`/);
  assert.match(content, /deriveFollowupBreakdownDraft/);
  assert.match(content, /fromStatus: "consumed", toStatus: "draft"/);
  assert.match(content, /> 派生自:task <source_task_id>\(<source_task_key>\)/);
  assert.match(content, /materializeRequirement\(\{ expectedDraftHash: approvedHash \}\)/);
});
