const DEFAULT_PROVIDER_COMPLEMENTS = Object.freeze({
  claude: Object.freeze(["codex"]),
  codex: Object.freeze(["claude"])
});

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

  return value.split(/[;,]/).map((rawMember) => {
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
  const currentAgent = String(agentName ?? "").trim();
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
  const actorName = String(currentAgent ?? "").trim();
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
