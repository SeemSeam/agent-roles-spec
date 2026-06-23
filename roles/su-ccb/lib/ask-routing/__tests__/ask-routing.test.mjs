import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  buildCcbAskInvocation,
  resolveAskRouting
} from "../index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../../..");

const configText = `
version = 2

[windows]
alpha = "alpha_claude:claude, alpha_codex:codex"
beta = "beta_claude:claude, beta_codex:codex"
ambiguous = "lead_claude:claude, codex_a:codex, codex_b:codex"
solo = "solo_claude:claude"
`;

test("implicit routing resolves the same-group peer", async () => {
  const routing = await resolveAskRouting({
    configText,
    currentAgent: "alpha_claude"
  });

  assert.equal(routing.status, "ok");
  assert.equal(routing.target, "alpha_codex");
  assert.equal(routing.source, "same_group_peer");
  assert.equal(routing.currentWindow, "alpha");
  assert.deepEqual(routing.warnings, []);
});

test("implicit routing requires explicit target when peer is ambiguous", async () => {
  const routing = await resolveAskRouting({
    configText,
    currentAgent: "lead_claude"
  });

  assert.equal(routing.status, "needs_explicit_target");
  assert.equal(routing.target, null);
  assert.equal(routing.peerResult.kind, "ambiguous");
  assert.deepEqual(routing.peerResult.candidates, ["codex_a", "codex_b"]);
});

test("implicit routing requires explicit target when no peer exists", async () => {
  const routing = await resolveAskRouting({
    configText,
    currentAgent: "solo_claude"
  });

  assert.equal(routing.status, "needs_explicit_target");
  assert.equal(routing.peerResult.kind, "no_peer");
});

test("explicit target remains unchanged for same-group routing", async () => {
  const routing = await resolveAskRouting({
    configText,
    currentAgent: "alpha_claude",
    explicitTarget: "alpha_codex"
  });

  assert.equal(routing.status, "ok");
  assert.equal(routing.target, "alpha_codex");
  assert.equal(routing.source, "explicit");
  assert.equal(routing.crossGroup, null);
  assert.deepEqual(routing.warnings, []);
});

test("explicit cross-group target emits warning without changing target", async () => {
  const routing = await resolveAskRouting({
    configText,
    currentAgent: "alpha_claude",
    explicitTarget: "beta_codex"
  });

  assert.equal(routing.status, "ok");
  assert.equal(routing.target, "beta_codex");
  assert.equal(routing.source, "explicit");
  assert.equal(routing.crossGroup.requiresReason, true);
  assert.equal(routing.crossGroup.currentWindow, "alpha");
  assert.equal(routing.crossGroup.targetWindow, "beta");
  assert.match(routing.warnings[0], /provide a cross-group reason/);
});

test("explicit cross-group reason records the reason and suppresses warning", async () => {
  const routing = await resolveAskRouting({
    configText,
    currentAgent: "alpha_claude",
    explicitTarget: "beta_codex",
    crossGroupReason: "independent cross-check"
  });

  assert.equal(routing.status, "ok");
  assert.equal(routing.target, "beta_codex");
  assert.equal(routing.crossGroup.requiresReason, false);
  assert.equal(routing.crossGroup.reason, "independent cross-check");
  assert.deepEqual(routing.warnings, []);
});

test("routing anchors current agent from CCB environment when not passed explicitly", async () => {
  const routing = await resolveAskRouting({
    configText,
    env: { CCB_CALLER_ACTOR: "alpha_claude" }
  });

  assert.equal(routing.status, "ok");
  assert.equal(routing.target, "alpha_codex");
});

test("explicit target is preserved when current agent is unknown", async () => {
  const routing = await resolveAskRouting({
    configText,
    explicitTarget: "beta_codex",
    env: {}
  });

  assert.equal(routing.status, "ok");
  assert.equal(routing.target, "beta_codex");
  assert.equal(routing.source, "explicit");
  assert.match(routing.warnings[0], /current agent is unknown/);
});

test("routing can read current project ccb.config", async () => {
  const routing = await resolveAskRouting({
    projectRoot,
    currentAgent: "slot1_claude"
  });

  assert.equal(routing.status, "ok");
  assert.equal(routing.target, "slot1_codex");
  assert.equal(routing.currentWindow, "slot-1");
});

test("buildCcbAskInvocation keeps target separate from message text", () => {
  assert.deepEqual(
    buildCcbAskInvocation({
      target: "slot1_codex",
      taskId: "subtask-123",
      callback: true
    }),
    {
      command: "ccb",
      args: ["ask", "--callback", "--task-id", "subtask-123", "slot1_codex"],
      display: "ccb ask --callback --task-id subtask-123 slot1_codex"
    }
  );
});
