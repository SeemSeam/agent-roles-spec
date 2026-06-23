import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  findAgentWindows,
  parseWindowsTopology,
  resolveSameGroupPeer
} from "../agent-group/index.mjs";

const DEFAULT_ACTOR_ENV_KEYS = Object.freeze([
  "CCB_CALLER_ACTOR",
  "CCB_CURRENT_AGENT",
  "CCB_AGENT_NAME",
  "AGENT_NAME"
]);

function clean(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function currentAgentFromEnv(env, actorEnvKeys = DEFAULT_ACTOR_ENV_KEYS) {
  for (const key of actorEnvKeys) {
    const value = clean(env?.[key]);
    if (value) return value;
  }
  return null;
}

async function loadWindows({ projectRoot, configText }) {
  if (typeof configText === "string") {
    return parseWindowsTopology(configText);
  }
  const root = clean(projectRoot);
  if (!root) {
    throw new Error("projectRoot is required when configText is not provided");
  }
  return parseWindowsTopology(await readFile(join(root, ".ccb", "ccb.config"), "utf8"));
}

function oneWindowFor(windows, agentName) {
  const matches = findAgentWindows(windows, agentName);
  if (matches.length !== 1) return null;
  return matches[0].name;
}

function explicitTargetRouting({
  currentAgent,
  explicitTarget,
  windows,
  crossGroupReason
}) {
  const currentWindow = oneWindowFor(windows, currentAgent);
  const targetWindow = oneWindowFor(windows, explicitTarget);
  const crossGroup = Boolean(currentWindow && targetWindow && currentWindow !== targetWindow);
  const reason = clean(crossGroupReason);
  const warnings = [];

  if (crossGroup && !reason) {
    warnings.push(
      `explicit target ${explicitTarget} is outside ${currentAgent}'s window (${currentWindow} -> ${targetWindow}); provide a cross-group reason`
    );
  }

  return {
    status: "ok",
    target: explicitTarget,
    source: "explicit",
    currentAgent,
    currentWindow,
    targetWindow,
    crossGroup: crossGroup
      ? {
          currentWindow,
          targetWindow,
          requiresReason: !reason,
          reason
        }
      : null,
    warnings
  };
}

function implicitTargetRouting({ currentAgent, windows }) {
  const peerResult = resolveSameGroupPeer({ currentAgent, windows });
  if (peerResult.kind === "peer") {
    return {
      status: "ok",
      target: peerResult.peer,
      source: "same_group_peer",
      currentAgent,
      currentWindow: peerResult.window,
      targetWindow: peerResult.window,
      peerResult,
      crossGroup: null,
      warnings: []
    };
  }

  return {
    status: "needs_explicit_target",
    target: null,
    source: "unresolved",
    currentAgent,
    currentWindow: peerResult.window ?? null,
    peerResult,
    reason: peerResult.kind,
    message: `same-group peer is ${peerResult.kind}; provide an explicit ccb ask target`
  };
}

export async function resolveAskRouting({
  projectRoot,
  configText,
  currentAgent,
  explicitTarget,
  crossGroupReason,
  env = process.env,
  actorEnvKeys = DEFAULT_ACTOR_ENV_KEYS
} = {}) {
  const actor = clean(currentAgent) ?? currentAgentFromEnv(env, actorEnvKeys);
  const target = clean(explicitTarget);

  if (!actor && target) {
    return {
      status: "ok",
      target,
      source: "explicit",
      currentAgent: null,
      currentWindow: null,
      targetWindow: null,
      crossGroup: null,
      warnings: ["current agent is unknown; explicit target preserved but cross-group routing could not be checked"]
    };
  }

  if (!actor) {
    return {
      status: "needs_explicit_target",
      target,
      source: "unresolved",
      currentAgent: null,
      currentWindow: null,
      peerResult: { kind: "no_peer", reason: "missing_current_agent" },
      reason: "missing_current_agent",
      message: "current agent is unknown; provide an explicit ccb ask target"
    };
  }

  const windows = await loadWindows({ projectRoot, configText });
  if (target) {
    return explicitTargetRouting({
      currentAgent: actor,
      explicitTarget: target,
      windows,
      crossGroupReason
    });
  }

  return implicitTargetRouting({ currentAgent: actor, windows });
}

export function buildCcbAskInvocation({
  target,
  taskId,
  wait = false,
  callback = false,
  silence = false
}) {
  const askTarget = clean(target);
  if (!askTarget) {
    throw new Error("target is required to build ccb ask invocation");
  }

  const args = ["ask"];
  if (wait) args.push("--wait");
  if (callback) args.push("--callback");
  if (silence) args.push("--silence");
  const normalizedTaskId = clean(taskId);
  if (normalizedTaskId) args.push("--task-id", normalizedTaskId);
  args.push(askTarget);

  return {
    command: "ccb",
    args,
    display: ["ccb", ...args].join(" ")
  };
}
