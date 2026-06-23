import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  parseWindowsTopology,
  resolveSameGroupPeer
} from "../index.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../../..");

test("resolver returns peer for a single claude and codex group", () => {
  const windows = [
    {
      name: "pair-a",
      agents: [
        { name: "agent_claude", provider: "claude" },
        { name: "agent_codex", provider: "codex" }
      ]
    }
  ];

  assert.deepEqual(resolveSameGroupPeer({ currentAgent: "agent_claude", windows }), {
    kind: "peer",
    peer: "agent_codex",
    window: "pair-a"
  });
});

test("resolver returns no_peer for single-provider group", () => {
  const windows = [
    {
      name: "reviewers",
      agents: [
        { name: "claude_a", provider: "claude" },
        { name: "claude_b", provider: "claude" }
      ]
    }
  ];

  assert.deepEqual(resolveSameGroupPeer({ currentAgent: "claude_a", windows }), {
    kind: "no_peer",
    reason: "no_complementary_peer",
    window: "reviewers",
    candidates: []
  });
});

test("resolver returns ambiguous for multiple complementary peers", () => {
  const windows = [
    {
      name: "implementation",
      agents: [
        { name: "lead_claude", provider: "claude" },
        { name: "codex_a", provider: "codex" },
        { name: "codex_b", provider: "codex" }
      ]
    }
  ];

  assert.deepEqual(resolveSameGroupPeer({ currentAgent: "lead_claude", windows }), {
    kind: "ambiguous",
    reason: "multiple_complementary_peers",
    window: "implementation",
    candidates: ["codex_a", "codex_b"]
  });
});

test("resolver returns no_peer for unknown agent", () => {
  const windows = [
    {
      name: "pair-a",
      agents: [
        { name: "agent_claude", provider: "claude" },
        { name: "agent_codex", provider: "codex" }
      ]
    }
  ];

  assert.deepEqual(resolveSameGroupPeer({ currentAgent: "missing_agent", windows }), {
    kind: "no_peer",
    reason: "agent_not_found"
  });
});

test("parser and resolver group by window name without slot prefix assumptions", () => {
  const windows = parseWindowsTopology(`
version = 2

[windows]
alpha-team = "alpha_claude:claude, alpha_codex:codex"
research = "review_claude:claude"

[agents.alpha_claude]
provider = "claude"
`);

  assert.deepEqual(windows, [
    {
      name: "alpha-team",
      agents: [
        { name: "alpha_claude", provider: "claude" },
        { name: "alpha_codex", provider: "codex" }
      ]
    },
    {
      name: "research",
      agents: [{ name: "review_claude", provider: "claude" }]
    }
  ]);
  assert.deepEqual(resolveSameGroupPeer({ currentAgent: "alpha_claude", windows }), {
    kind: "peer",
    peer: "alpha_codex",
    window: "alpha-team"
  });
});

test("parser handles comments and single-quoted window values", () => {
  const windows = parseWindowsTopology(`
[windows]
main = "main_claude:claude, main_codex:codex" # inline comment
beta = 'beta_codex:codex, beta_claude:CLAUDE'

[ui.sidebar]
mode = "every_window"
`);

  assert.deepEqual(windows, [
    {
      name: "main",
      agents: [
        { name: "main_claude", provider: "claude" },
        { name: "main_codex", provider: "codex" }
      ]
    },
    {
      name: "beta",
      agents: [
        { name: "beta_codex", provider: "codex" },
        { name: "beta_claude", provider: "claude" }
      ]
    }
  ]);
});

test("parser reads current ccb.config main and slot windows", async () => {
  const configText = await readFile(join(projectRoot, ".ccb/ccb.config"), "utf8");
  const windows = parseWindowsTopology(configText);

  assert.deepEqual(
    windows.map((window) => window.name),
    ["main", "slot-1", "slot-2", "slot-3", "slot-4"]
  );
  assert.deepEqual(resolveSameGroupPeer({ currentAgent: "slot1_claude", windows }), {
    kind: "peer",
    peer: "slot1_codex",
    window: "slot-1"
  });
});
