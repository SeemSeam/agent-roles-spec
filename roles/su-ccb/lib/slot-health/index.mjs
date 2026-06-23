import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";

import { resolveDocType } from "../docs-structure/index.mjs";
import { appendEvent as defaultAppendEvent } from "../runtime/index.mjs";

const POLICY_VERSION = "slot-stale-policy-v1";
const DEFAULT_STALE_THRESHOLD_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function docsPath(projectRoot, ...parts) {
  return join(projectRoot, "docs", ".ccb", ...parts);
}

function projectContractPath(projectRoot) {
  return docsPath(projectRoot, "docs-structure-contract.yaml");
}

function normalizeRelative(path) {
  return path.replace(/\\/g, "/");
}

function parseFrontmatter(content) {
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!matched) return {};
  const frontmatter = {};
  for (const rawLine of matched[1].split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    frontmatter[key] = value;
  }
  return frontmatter;
}

async function fileExists(path) {
  try {
    await readFile(path, "utf8");
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function resolveDocDirectory(projectRoot, docType) {
  const contractPath = projectContractPath(projectRoot);
  const options = (await fileExists(contractPath)) ? { contractPath } : {};
  const resolved = await resolveDocType(docType, options);
  return join(projectRoot, resolved.directory);
}

function isTemplateMarkdown(path) {
  return basename(path).startsWith("_模板_");
}

async function listMarkdownFiles(root) {
  const files = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error?.code === "ENOENT") return;
      throw error;
    }
    for (const entry of entries) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile() && entry.name.endsWith(".md") && !isTemplateMarkdown(path)) {
        files.push(path);
      }
    }
  }
  try {
    await walk(root);
    return files.sort();
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function collectActiveRequirements({ projectRoot }) {
  const root = await resolveDocDirectory(projectRoot, "requirement");
  const files = await listMarkdownFiles(root);
  const requirements = [];
  for (const path of files) {
    const content = await readFile(path, "utf8");
    const frontmatter = parseFrontmatter(content);
    if (frontmatter.doc_type !== "requirement") continue;
    if (!["drafting", "planning", "delivering"].includes(frontmatter.status)) continue;
    const id = frontmatter.id ?? basename(path, ".md");
    if (!id) continue;
    requirements.push({
      id,
      title: frontmatter.title ?? id,
      path: normalizeRelative(relative(projectRoot, path))
    });
  }
  return requirements;
}

export function parseSlotStalePolicy(text) {
  const values = new Map();
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const matched = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.+)$/);
    if (matched) values.set(matched[1], matched[2].trim());
  }
  const staleThresholdDays = Number(values.get("stale_threshold_days"));
  return {
    staleThresholdDays: Number.isFinite(staleThresholdDays) && staleThresholdDays > 0
      ? staleThresholdDays
      : DEFAULT_STALE_THRESHOLD_DAYS,
    policyVersion: POLICY_VERSION
  };
}

async function readSlotStalePolicy(projectRoot) {
  try {
    return parseSlotStalePolicy(await readFile(docsPath(projectRoot, "config", "slot-stale-policy.yaml"), "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return parseSlotStalePolicy("");
    throw error;
  }
}

async function collectJournalEvents(path) {
  let content;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  const events = [];
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      console.warn(
        `bad EventJournal line skipped during slot-health: ${path}:${index + 1}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  return events;
}

function requirementIdForCapabilityOutcome(event) {
  if (event?.type !== "capability_outcome_applied") return null;
  if (event.subject_type === "requirement" && typeof event.subject_id === "string") {
    return event.subject_id;
  }
  const subjectRef = event.payload?.subject_ref;
  if (subjectRef?.subject_type === "requirement" && typeof subjectRef.subject_id === "string") {
    return subjectRef.subject_id;
  }
  return null;
}

function latestCapabilityOutcomeByRequirement(events, activeRequirementIds) {
  const latest = new Map();
  for (const event of events) {
    const requirementId = requirementIdForCapabilityOutcome(event);
    if (!requirementId || !activeRequirementIds.has(requirementId)) continue;
    const emittedAt = new Date(event.emitted_at);
    if (Number.isNaN(emittedAt.getTime())) continue;
    const existing = latest.get(requirementId);
    if (!existing || emittedAt > existing) {
      latest.set(requirementId, emittedAt);
    }
  }
  return latest;
}

export async function runSlotStaleHealthCheck({
  projectRoot,
  now = new Date().toISOString(),
  journalPath = docsPath(projectRoot, "events", "journal.jsonl"),
  appendEvent = defaultAppendEvent
}) {
  const [requirements, policy, events] = await Promise.all([
    collectActiveRequirements({ projectRoot }),
    readSlotStalePolicy(projectRoot),
    collectJournalEvents(journalPath)
  ]);
  const activeIds = new Set(requirements.map((item) => item.id));
  const lastActivityByRequirement = latestCapabilityOutcomeByRequirement(events, activeIds);
  const nowDate = new Date(now);

  let staleCandidates = 0;
  let staleAppended = 0;
  let duplicates = 0;
  let failed = 0;
  let skippedNoActivity = 0;

  for (const requirement of requirements) {
    const lastActivityAt = lastActivityByRequirement.get(requirement.id);
    if (!lastActivityAt) {
      skippedNoActivity++;
      continue;
    }
    const staleDays = Math.floor((nowDate.getTime() - lastActivityAt.getTime()) / DAY_MS);
    if (staleDays < policy.staleThresholdDays) continue;
    staleCandidates++;

    const lastActivityIso = lastActivityAt.toISOString();
    const result = await appendEvent(
      {
        type: "slot_stale",
        subject_type: "requirement",
        subject_id: requirement.id,
        payload: {
          requirementId: requirement.id,
          lastActivityAt: lastActivityIso,
          staleDays,
          policyVersion: policy.policyVersion
        },
        idempotency_key: `slot-health:slot_stale:${requirement.id}:${lastActivityIso}:${policy.policyVersion}`,
        emitted_at: nowDate.toISOString(),
        source_actor: "ccb_claude"
      },
      { projectRoot, journalPath, failPolicy: "warning-only" }
    );
    if (result.appended) staleAppended++;
    else if (result.duplicate) duplicates++;
    else if (result.failed) failed++;
  }

  return {
    requirementsChecked: requirements.length,
    staleCandidates,
    staleAppended,
    duplicates,
    failed,
    skippedNoActivity,
    policy
  };
}
