#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_PROVIDER_COMPLEMENTS = Object.freeze({
  claude: Object.freeze(["codex"]),
  codex: Object.freeze(["claude"])
});

const CONTRACT_MARKERS = Object.freeze([
  "Agent Routing Contract",
  "ccb.config [windows]",
  "peer",
  "ambiguous",
  "no_peer"
]);

function clean(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function stripInlineComment(line) {
  let quote = null;
  let escaped = false;

  for (let index = 0; index < line.length; index++) {
    const char = line[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (quote === "\"" && char === "\\") {
      escaped = true;
      continue;
    }

    if ((char === "\"" || char === "'") && !quote) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = null;
      continue;
    }

    if (char === "#" && !quote) {
      return line.slice(0, index);
    }
  }

  return line;
}

function unquoteValue(value) {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === "\"" || quote === "'") && trimmed.at(-1) === quote) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseWindowAgents(rawValue, lineNumber) {
  const value = unquoteValue(rawValue);
  if (!value.trim()) return [];

  return value.split(",").map((rawMember) => {
    const member = rawMember.trim();
    const separatorIndex = member.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(`invalid [windows] member at line ${lineNumber}: expected name:provider`);
    }

    const name = member.slice(0, separatorIndex).trim();
    const provider = member.slice(separatorIndex + 1).trim().toLowerCase();
    if (!name || !provider) {
      throw new Error(`invalid [windows] member at line ${lineNumber}: expected name:provider`);
    }

    return { name, provider };
  });
}

export function parseWindowsTopology(configText) {
  if (typeof configText !== "string") {
    throw new TypeError("configText must be a string");
  }

  const windows = [];
  let inWindowsSection = false;

  for (const [index, rawLine] of configText.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const line = stripInlineComment(rawLine).trim();
    if (!line) continue;

    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      inWindowsSection = sectionMatch[1].trim() === "windows";
      continue;
    }

    if (!inWindowsSection) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) {
      throw new Error(`invalid [windows] entry at line ${lineNumber}: expected key = value`);
    }

    const name = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();
    if (!name) {
      throw new Error(`invalid [windows] entry at line ${lineNumber}: missing window name`);
    }

    windows.push({
      name,
      agents: parseWindowAgents(rawValue, lineNumber)
    });
  }

  return windows;
}

function normalizeProviderComplements(providerComplements) {
  const normalized = new Map();
  for (const [provider, complements] of Object.entries(providerComplements ?? {})) {
    normalized.set(
      provider.trim().toLowerCase(),
      new Set(complements.map((item) => item.trim().toLowerCase()))
    );
  }
  return normalized;
}

export function findAgentWindows(windows, agentName) {
  const currentAgent = clean(agentName);
  if (!currentAgent) return [];

  return (windows ?? [])
    .filter((window) => (window.agents ?? []).some((agent) => agent.name === currentAgent))
    .map((window) => ({
      name: window.name,
      agents: (window.agents ?? []).map((agent) => ({
        name: agent.name,
        provider: String(agent.provider ?? "").trim().toLowerCase()
      }))
    }));
}

export function resolveSameGroupPeer({
  currentAgent,
  windows,
  providerComplements = DEFAULT_PROVIDER_COMPLEMENTS
}) {
  const actorName = clean(currentAgent);
  if (!actorName) {
    return { kind: "no_peer", reason: "missing_current_agent" };
  }

  const actorWindows = findAgentWindows(windows, actorName);
  if (actorWindows.length === 0) {
    return { kind: "no_peer", reason: "agent_not_found" };
  }

  if (actorWindows.length > 1) {
    return {
      kind: "ambiguous",
      reason: "agent_in_multiple_windows",
      windows: actorWindows.map((window) => window.name)
    };
  }

  const [window] = actorWindows;
  const actor = window.agents.find((agent) => agent.name === actorName);
  const provider = String(actor?.provider ?? "").trim().toLowerCase();
  const complements = normalizeProviderComplements(providerComplements).get(provider);

  if (!complements || complements.size === 0) {
    return {
      kind: "no_peer",
      reason: "unknown_complementary_provider",
      window: window.name
    };
  }

  const candidates = window.agents
    .filter((agent) => agent.name !== actorName && complements.has(agent.provider))
    .map((agent) => agent.name);

  if (candidates.length === 1) {
    return {
      kind: "peer",
      peer: candidates[0],
      window: window.name
    };
  }

  if (candidates.length > 1) {
    return {
      kind: "ambiguous",
      reason: "multiple_complementary_peers",
      window: window.name,
      candidates
    };
  }

  return {
    kind: "no_peer",
    reason: "no_complementary_peer",
    window: window.name,
    candidates: []
  };
}

export function assertAgentRoutingContract(contractText) {
  if (typeof contractText !== "string") {
    throw new TypeError("contractText must be a string");
  }

  const missing = CONTRACT_MARKERS.filter((marker) => !contractText.includes(marker));
  if (missing.length > 0) {
    throw new Error(`agent routing contract missing markers: ${missing.join(", ")}`);
  }

  return true;
}

export async function readProjectInputs({
  projectRoot = process.cwd(),
  configPath,
  contractPath
} = {}) {
  const root = resolve(projectRoot);
  const resolvedConfigPath = configPath ? resolve(configPath) : join(root, ".ccb", "ccb.config");
  // contract 不再硬性要求项目根 kernel：显式 contractPath 优先；否则按布局候选发现
  //（① 项目根有 references/kernel；② 平级 su-ccb-claude-plugin 分发 kernel）。
  // 两者都不存在时降级为仅按 .ccb/ccb.config [windows] 解析，不抛错。
  const contractCandidates = contractPath
    ? [resolve(contractPath)]
    : [
        join(root, "references", "kernel", "agent-routing-contract.md"),
        join(root, "su-ccb-claude-plugin", "references", "kernel", "agent-routing-contract.md")
      ];
  const resolvedContractPath = contractCandidates.find((candidate) => existsSync(candidate)) ?? contractCandidates[0];

  const configText = await readFile(resolvedConfigPath, "utf8");
  let contractText = null;
  if (existsSync(resolvedContractPath)) {
    contractText = await readFile(resolvedContractPath, "utf8");
    assertAgentRoutingContract(contractText);
  } else if (contractPath) {
    // 显式指定但缺失 → 仍视为错误
    contractText = await readFile(resolvedContractPath, "utf8");
  }

  return {
    configText,
    contractText,
    configPath: resolvedConfigPath,
    contractPath: resolvedContractPath
  };
}

export async function resolveSameGroupPeerFromProject({
  projectRoot = process.cwd(),
  currentAgent,
  configPath,
  contractPath
} = {}) {
  const inputs = await readProjectInputs({ projectRoot, configPath, contractPath });
  const windows = parseWindowsTopology(inputs.configText);
  return {
    result: resolveSameGroupPeer({ currentAgent, windows }),
    windows,
    configPath: inputs.configPath,
    contractPath: inputs.contractPath
  };
}

function parseArgs(argv) {
  const args = {
    projectRoot: process.cwd(),
    currentAgent: null,
    configPath: null,
    contractPath: null,
    pretty: false
  };

  for (let index = 0; index < argv.length; index++) {
    const item = argv[index];
    if (item === "--project-root") {
      args.projectRoot = argv[++index];
    } else if (item === "--current-agent") {
      args.currentAgent = argv[++index];
    } else if (item === "--config") {
      args.configPath = argv[++index];
    } else if (item === "--contract") {
      args.contractPath = argv[++index];
    } else if (item === "--pretty") {
      args.pretty = true;
    } else if (item === "--help" || item === "-h") {
      args.help = true;
    } else {
      throw new Error(`unknown argument: ${item}`);
    }
  }

  return args;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/resolve-same-group-peer.mjs --project-root <project> --current-agent <agent> [--pretty]",
    "",
    "Reads <project>/.ccb/ccb.config (required) and an agent-routing-contract.md if present (project kernel or sibling plugin); contract optional.",
    "Prints JSON: { result, configPath, contractPath }."
  ].join("\n");
}

async function main(argv) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!clean(args.currentAgent)) {
    throw new Error("--current-agent is required");
  }

  const resolved = await resolveSameGroupPeerFromProject(args);
  const payload = {
    result: resolved.result,
    configPath: resolved.configPath,
    contractPath: resolved.contractPath
  };
  console.log(JSON.stringify(payload, null, args.pretty ? 2 : 0));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
