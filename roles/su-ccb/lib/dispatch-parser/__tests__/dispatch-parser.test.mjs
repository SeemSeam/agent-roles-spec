import assert from "node:assert/strict";
import test from "node:test";

import {
  buildAnchorDispatchCommand,
  parseAnchorDispatchCommand
} from "../index.mjs";
import { ValidationError } from "../../runtime/index.mjs";

test("anchor dispatch parser accepts slash command with structured JSON payload", async () => {
  const commandText = buildAnchorDispatchCommand({
    command: "su-revise-breakdown",
    payload: {
      subject: "requirement",
      requirement_id: "req-1",
      action: "breakdown_draft_reject",
      expected_hash: "a".repeat(64),
      feedback: {
        summary: "请重新拆分前后端任务，并保留多行反馈。\n第二行仍应保留。",
        items: ["合并重复 UI slice", "补齐验收标准"]
      }
    }
  });

  assert.doesNotMatch(commandText, /feedback_b64|subject=requirement/);
  assert.match(commandText, /^\/ccb:su-revise-breakdown --payload \{/);

  const parsed = await parseAnchorDispatchCommand(commandText);

  assert.equal(parsed.command, "su-revise-breakdown");
  assert.deepEqual(parsed.payload.feedback, {
    summary: "请重新拆分前后端任务，并保留多行反馈。\n第二行仍应保留。",
    items: ["合并重复 UI slice", "补齐验收标准"]
  });
});

test("anchor dispatch parser accepts JSON line payload", async () => {
  const parsed = await parseAnchorDispatchCommand(
    JSON.stringify({
      command: "su-flow",
      payload: {
        subject: "requirement",
        requirement_id: "req-1",
        step: "design"
      }
    })
  );

  assert.equal(parsed.command, "su-flow");
  assert.equal(parsed.payload.step, "design");
});

test("anchor dispatch parser rejects legacy key-value command format", async () => {
  await assert.rejects(
    () => parseAnchorDispatchCommand("/ccb:su-flow subject=requirement requirement_id=req-1 step=design"),
    ValidationError
  );
});

test("anchor dispatch parser rejects business base64 fields inside JSON payload", async () => {
  await assert.rejects(
    () =>
      parseAnchorDispatchCommand(
        '/ccb:su-revise-breakdown --payload {"subject":"requirement","feedback_b64":"abc"}'
      ),
    /payload must not contain \*_b64 business fields/
  );
});

test("anchor dispatch parser rejects oversized payloads", async () => {
  const commandText = buildAnchorDispatchCommand({
    command: "su-flow",
    payload: {
      subject: "requirement",
      requirement_id: "req-1",
      note: "x".repeat(100)
    }
  });

  await assert.rejects(
    () => parseAnchorDispatchCommand(commandText, { maxPayloadBytes: 32 }),
    /payload exceeds 32 bytes/
  );
});
