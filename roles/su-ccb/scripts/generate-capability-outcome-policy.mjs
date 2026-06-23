#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_POLICY = join(ROOT, "references/kernel/capability-outcome-policy.yaml");
const DEFAULT_PLUGIN_OUT = join(ROOT, "lib/capability-outcome/generated-policy.mjs");
// console 输出默认关闭：plugin 默认只生成自身产物，不写 console（保持仓独立）。
// 下游（su-oriel）刷新自身 generated 时显式传 --console-out <path>。
const DEFAULT_CONSOLE_OUT = null;

const SUBJECT_TYPES = new Set(["requirement", "subtask", "task"]);
const WRITE_TARGETS = new Set(["dev_task", "requirement_md"]);
const EVIDENCE_KINDS = new Set(["A", "B", "C"]);
const CHECK_IDS = new Set([
  "file_exists",
  "schema_valid",
  "count_gt_zero",
  "hash_matches",
  "journal_event_exists",
  "dev_task_scope_terminal",
  "dev_task_requirement_terminal"
]);
const STATE_FIELDS = new Set([
  "status",
  "current_node",
  "node_substate",
  "review_status",
  "blocked_reason",
  "verification_result",
  "review_followup"
]);
const EVIDENCE_MODES = new Set(["none", "all", "any"]);

function scalar(raw) {
  const value = raw.trim();
  if (value === "[]") return [];
  if (value.startsWith("[") && value.endsWith("]")) {
    const body = value.slice(1, -1).trim();
    return body ? body.split(",").map((item) => scalar(item)) : [];
  }
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^-?\d+$/.test(value)) return Number.parseInt(value, 10);
  return value.replace(/^['"]|['"]$/g, "");
}

function stripComment(line) {
  let quoted = false;
  let quote = "";
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === "'" || char === '"') && (index === 0 || line[index - 1] !== "\\")) {
      if (!quoted) {
        quoted = true;
        quote = char;
      } else if (quote === char) {
        quoted = false;
      }
    }
    if (!quoted && char === "#") return line.slice(0, index);
  }
  return line;
}

function parseYamlSubset(content) {
  const root = {};
  const stack = [{ indent: -1, value: root, key: null, parent: null }];
  const lines = content.split(/\r?\n/);

  function currentFor(indent) {
    while (stack.length > 1 && stack.at(-1).indent >= indent) stack.pop();
    return stack.at(-1);
  }

  function ensureContainer(frame, key, nextIsArray) {
    if (frame.value[key] === undefined) frame.value[key] = nextIsArray ? [] : {};
    return frame.value[key];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = stripComment(lines[index]).replace(/\s+$/, "");
    if (!raw.trim()) continue;
    const indent = raw.match(/^ */)?.[0].length ?? 0;
    const text = raw.trim();
    const parent = currentFor(indent);

    if (text.startsWith("- ")) {
      if (!Array.isArray(parent.value)) {
        throw new Error(`line ${index + 1}: list item without list parent`);
      }
      const body = text.slice(2).trim();
      if (!body) {
        const item = {};
        parent.value.push(item);
        stack.push({ indent, value: item, key: null, parent: parent.value });
        continue;
      }
      const match = body.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (match) {
        const item = {};
        item[match[1]] = match[2] ? scalar(match[2]) : {};
        parent.value.push(item);
        stack.push({ indent, value: item, key: null, parent: parent.value });
        if (!match[2]) {
          stack.push({ indent: indent + 2, value: item[match[1]], key: match[1], parent: item });
        }
      } else {
        parent.value.push(scalar(body));
      }
      continue;
    }

    const match = text.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!match) throw new Error(`line ${index + 1}: unsupported YAML syntax`);
    const [, key, value] = match;
    if (value) {
      parent.value[key] = scalar(value);
      continue;
    }

    const nextLine = lines.slice(index + 1).find((line) => stripComment(line).trim());
    const nextIsArray = Boolean(nextLine && stripComment(nextLine).trim().startsWith("- "));
    const container = ensureContainer(parent, key, nextIsArray);
    stack.push({ indent, value: container, key, parent: parent.value });
  }

  return root;
}

function validatePolicyDocument(doc) {
  const issues = [];
  if (doc.version !== "v1.0") issues.push("version must be v1.0");
  if (!Array.isArray(doc.policies)) issues.push("policies must be an array");
  const seen = new Set();

  for (const [index, policy] of (doc.policies ?? []).entries()) {
    const prefix = `policies[${index}]`;
    for (const key of [
      "policy_id",
      "capability_id",
      "outcome_type",
      "subject_type",
      "write_target",
      "state_effects",
      "evidence_required",
      "must_ask_refs"
    ]) {
      if (policy[key] === undefined) issues.push(`${prefix}.${key} is required`);
    }
    if (!SUBJECT_TYPES.has(policy.subject_type)) issues.push(`${prefix}.subject_type unknown: ${policy.subject_type}`);
    if (!WRITE_TARGETS.has(policy.write_target)) issues.push(`${prefix}.write_target unknown: ${policy.write_target}`);
    const tuple = `${policy.capability_id}:${policy.outcome_type}:${policy.subject_type}`;
    if (seen.has(tuple)) issues.push(`duplicate policy tuple: ${tuple}`);
    seen.add(tuple);

    for (const field of Object.keys(policy.state_effects ?? {})) {
      if (!STATE_FIELDS.has(field)) issues.push(`${prefix}.state_effects unknown field: ${field}`);
    }
    const evidence = policy.evidence_required ?? {};
    if (!EVIDENCE_MODES.has(evidence.mode)) issues.push(`${prefix}.evidence_required.mode unknown: ${evidence.mode}`);
    if (!Array.isArray(evidence.items)) issues.push(`${prefix}.evidence_required.items must be an array`);
    for (const [evidenceIndex, item] of (evidence.items ?? []).entries()) {
      if (!EVIDENCE_KINDS.has(item.kind)) issues.push(`${prefix}.evidence_required.items[${evidenceIndex}] unknown kind: ${item.kind}`);
      if (!CHECK_IDS.has(item.check_id)) issues.push(`${prefix}.evidence_required.items[${evidenceIndex}] unknown check_id: ${item.check_id}`);
    }
    if (!Array.isArray(policy.must_ask_refs)) issues.push(`${prefix}.must_ask_refs must be an array`);
  }

  return { ok: issues.length === 0, issues };
}

function renderPlugin(doc) {
  return `// Generated by scripts/generate-capability-outcome-policy.mjs.
// Do not edit manually. capability-outcome-policy.yaml is the source.

export const POLICY_VERSION = ${JSON.stringify(doc.version)};
export const ALLOWED_EVIDENCE_CHECK_IDS = ${JSON.stringify([...CHECK_IDS].sort(), null, 2)};
export const ALLOWED_BUSINESS_FIELDS = ${JSON.stringify([...STATE_FIELDS].sort(), null, 2)};
export const POLICIES = ${JSON.stringify(doc.policies, null, 2)};

export function resolveCapabilityOutcomePolicy({ capabilityId, outcomeType, subjectType }) {
  return POLICIES.find((policy) =>
    policy.status !== "disabled" &&
    policy.capability_id === capabilityId &&
    policy.outcome_type === outcomeType &&
    policy.subject_type === subjectType
  ) ?? null;
}

export function validateCapabilityOutcomePolicyShape(document) {
  const issues = [];
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return { ok: false, issues: ["policy document must be an object"] };
  }
  if (document.version !== "v1.0") issues.push("version must be v1.0");
  if (!Array.isArray(document.policies)) {
    issues.push("policies must be an array");
    return { ok: false, issues };
  }
  const seen = new Set();
  const subjectTypes = new Set(${JSON.stringify([...SUBJECT_TYPES])});
  const writeTargets = new Set(${JSON.stringify([...WRITE_TARGETS])});
  const evidenceKinds = new Set(${JSON.stringify([...EVIDENCE_KINDS])});
  const checkIds = new Set(${JSON.stringify([...CHECK_IDS])});
  const stateFields = new Set(${JSON.stringify([...STATE_FIELDS])});
  for (const [index, policy] of document.policies.entries()) {
    const prefix = \`policies[\${index}]\`;
    for (const key of ["policy_id", "capability_id", "outcome_type", "subject_type", "write_target", "state_effects", "evidence_required", "must_ask_refs"]) {
      if (policy?.[key] === undefined) issues.push(\`\${prefix}.\${key} is required\`);
    }
    if (!subjectTypes.has(policy?.subject_type)) issues.push(\`\${prefix}.subject_type unknown: \${policy?.subject_type}\`);
    if (!writeTargets.has(policy?.write_target)) issues.push(\`\${prefix}.write_target unknown: \${policy?.write_target}\`);
    const tuple = \`\${policy?.capability_id}:\${policy?.outcome_type}:\${policy?.subject_type}\`;
    if (seen.has(tuple)) issues.push(\`duplicate policy tuple: \${tuple}\`);
    seen.add(tuple);
    for (const field of Object.keys(policy?.state_effects ?? {})) {
      if (!stateFields.has(field)) issues.push(\`\${prefix}.state_effects unknown field: \${field}\`);
    }
    if (!["none", "all", "any"].includes(policy?.evidence_required?.mode)) issues.push(\`\${prefix}.evidence_required.mode unknown: \${policy?.evidence_required?.mode}\`);
    for (const [evidenceIndex, item] of (policy?.evidence_required?.items ?? []).entries()) {
      if (!evidenceKinds.has(item.kind)) issues.push(\`\${prefix}.evidence_required.items[\${evidenceIndex}] unknown kind: \${item.kind}\`);
      if (!checkIds.has(item.check_id)) issues.push(\`\${prefix}.evidence_required.items[\${evidenceIndex}] unknown check_id: \${item.check_id}\`);
    }
    if (!Array.isArray(policy?.must_ask_refs)) issues.push(\`\${prefix}.must_ask_refs must be an array\`);
  }
  return { ok: issues.length === 0, issues };
}
`;
}

function renderConsole(doc) {
  return `// Generated by scripts/generate-capability-outcome-policy.mjs.
// Do not edit manually. capability-outcome-policy.yaml is the source.

export const CAPABILITY_OUTCOME_POLICY_VERSION = ${JSON.stringify(doc.version)} as const;
export const CAPABILITY_OUTCOME_POLICIES = ${JSON.stringify(doc.policies, null, 2)} as const;
export const CAPABILITY_OUTCOME_ALLOWED_BUSINESS_FIELDS = ${JSON.stringify([...STATE_FIELDS].sort(), null, 2)} as const;

export type CapabilityOutcomePolicy = (typeof CAPABILITY_OUTCOME_POLICIES)[number];

export function resolveCapabilityOutcomePolicy(input: {
  capabilityId: string;
  outcomeType: string;
  subjectType: string;
}): CapabilityOutcomePolicy | null {
  return CAPABILITY_OUTCOME_POLICIES.find((policy) =>
    (policy as { status?: string }).status !== "disabled" &&
    policy.capability_id === input.capabilityId &&
    policy.outcome_type === input.outcomeType &&
    policy.subject_type === input.subjectType
  ) ?? null;
}
`;
}

function argValue(args, name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

export async function generateCapabilityOutcomePolicy({
  policyPath = DEFAULT_POLICY,
  pluginOut = DEFAULT_PLUGIN_OUT,
  consoleOut = DEFAULT_CONSOLE_OUT
} = {}) {
  const doc = parseYamlSubset(await readFile(policyPath, "utf8"));
  const validation = validatePolicyDocument(doc);
  if (!validation.ok) {
    throw new Error(validation.issues.join("\n"));
  }
  await mkdir(dirname(pluginOut), { recursive: true });
  await writeFile(pluginOut, renderPlugin(doc), "utf8");
  if (consoleOut) {
    await mkdir(dirname(consoleOut), { recursive: true });
    await writeFile(consoleOut, renderConsole(doc), "utf8");
  }
  return { policyPath, pluginOut, consoleOut, policyCount: doc.policies.length };
}

async function main() {
  const args = process.argv.slice(2);
  const result = await generateCapabilityOutcomePolicy({
    policyPath: argValue(args, "--policy", DEFAULT_POLICY),
    pluginOut: argValue(args, "--plugin-out", DEFAULT_PLUGIN_OUT),
    consoleOut: argValue(args, "--console-out", DEFAULT_CONSOLE_OUT)
  });
  console.log(`[capability-policy] generated ${result.policyCount} policies`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
