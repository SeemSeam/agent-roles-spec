import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { basename, isAbsolute, join, relative } from "node:path";

import {
  appendEvent,
  safeWriteFile,
  ValidationError,
  validateAgainstSchema,
  withFileLock
} from "../runtime/index.mjs";
import { applyCapabilityOutcome } from "../capability-outcome/index.mjs";
import { resolveDocType } from "../docs-structure/index.mjs";

const EXPRESSION_SPEC_VERSION = "v1";

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

const RESERVED_BODY_HEADINGS = [
  "需求描述",
  "原话（verbatim）",
  "原话",
  "verbatim",
  "Claude 解读",
  "Claude 解读（可选）",
  "歧义点",
  "歧义点（可选）",
  "保真差异",
  "保真差异（可选）"
];

const VERBATIM_HEADINGS = ["原话（verbatim）", "原话", "verbatim"];
const CLAUDE_INTERPRETATION_HEADINGS = ["Claude 解读", "Claude 解读（可选）"];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sectionHeadingPattern(heading) {
  return new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`);
}

function matchesAnyHeading(line, headings) {
  return headings.some((heading) => sectionHeadingPattern(heading).test(line));
}

function findHeadingIndex(lines, headings, fromIndex = 0) {
  return lines.findIndex((line, index) => index >= fromIndex && matchesAnyHeading(line, headings));
}

function findSectionRange(lines, headings, fromIndex = 0) {
  const headingIndex = findHeadingIndex(lines, headings, fromIndex);
  if (headingIndex === -1) {
    return null;
  }

  let nextHeadingIndex = lines.findIndex((line, index) => index > headingIndex && /^##\s+/.test(line));
  if (nextHeadingIndex === -1) {
    nextHeadingIndex = lines.length;
  }

  return { headingIndex, nextHeadingIndex };
}

function trimTrailingBlankLines(lines) {
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim().length === 0) {
    end -= 1;
  }
  return lines.slice(0, end);
}

function trimLeadingBlankLines(lines) {
  let start = 0;
  while (start < lines.length && lines[start].trim().length === 0) {
    start += 1;
  }
  return lines.slice(start);
}

function stripYamlQuotes(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function extractFrontmatter(content) {
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!matched) return {};
  const result = {};
  for (const line of matched[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf(":");
    if (index === -1) continue;
    result[trimmed.slice(0, index).trim()] = stripYamlQuotes(trimmed.slice(index + 1));
  }
  return result;
}

function docsPath(projectRoot, ...parts) {
  return join(projectRoot, "docs", ".ccb", ...parts);
}

function normalizePath(value) {
  return value.replace(/\\/g, "/");
}

function projectRelativePath(projectRoot, filePath) {
  const relativePath = isAbsolute(filePath) ? relative(projectRoot, filePath) : filePath;
  if (!relativePath || relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new Error(`requirement markdown is outside project root: ${filePath}`);
  }
  return normalizePath(relativePath);
}

function projectContractPath(projectRoot) {
  return docsPath(projectRoot, "docs-structure-contract.yaml");
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

function isTemplateMarkdown(filePath) {
  return basename(filePath).startsWith("_模板_");
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

  await walk(root);
  return files.sort();
}

export function extractTitle(content) {
  const frontmatter = extractFrontmatter(content);
  if (frontmatter.title) return frontmatter.title;

  const heading = content.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : "";
}

export function extractSection(content, heading) {
  const lines = content.split(/\r?\n/);
  const headingPattern = sectionHeadingPattern(heading);
  const headingIndex = lines.findIndex((line) => headingPattern.test(line));
  if (headingIndex === -1) {
    return "";
  }

  let nextHeadingIndex = lines.findIndex((line, index) => index > headingIndex && /^##\s+/.test(line));
  if (nextHeadingIndex === -1) {
    nextHeadingIndex = lines.length;
  }

  return lines.slice(headingIndex + 1, nextHeadingIndex).join("\n").trim();
}

export function replaceSection(content, heading, value) {
  const lines = content.split(/\r?\n/);
  const headingPattern = sectionHeadingPattern(heading);
  const headingIndex = lines.findIndex((line) => headingPattern.test(line));
  const sectionLines = value && value.trim().length > 0 ? [`## ${heading}`, "", value.trim()] : [];

  if (headingIndex === -1) {
    if (sectionLines.length === 0) {
      return content;
    }
    return `${content.trimEnd()}\n\n${sectionLines.join("\n")}\n`;
  }

  let nextHeadingIndex = lines.findIndex((line, index) => index > headingIndex && /^##\s+/.test(line));
  if (nextHeadingIndex === -1) {
    nextHeadingIndex = lines.length;
  }

  return [
    ...lines.slice(0, headingIndex),
    ...sectionLines,
    ...lines.slice(nextHeadingIndex)
  ].join("\n");
}

function findReservedBodyHeading(markdown) {
  for (const line of markdown.split(/\r?\n/)) {
    const heading = RESERVED_BODY_HEADINGS.find((candidate) => sectionHeadingPattern(candidate).test(line));
    if (heading) {
      return heading;
    }
  }
  return null;
}

function validateBodyMarkdown(value) {
  if (typeof value !== "string") {
    throw new ValidationError("analysis JSON field bodyMarkdown must be a string when provided", {
      issues: ["bodyMarkdown must be a string when provided"]
    });
  }

  const reservedHeading = findReservedBodyHeading(value);
  if (reservedHeading) {
    throw new ValidationError(`bodyMarkdown contains reserved requirement section heading: ${reservedHeading}`, {
      issues: [`bodyMarkdown must not contain reserved ## heading: ${reservedHeading}`]
    });
  }
}

function replaceBodyMarkdown(content, bodyMarkdown) {
  const trimmedBody = bodyMarkdown.trim();
  if (trimmedBody.length === 0) {
    return content;
  }

  const lines = content.split(/\r?\n/);
  const sourceRange = findSectionRange(lines, VERBATIM_HEADINGS) ?? findSectionRange(lines, ["需求描述"]);
  const startIndex = sourceRange?.nextHeadingIndex ?? lines.length;
  const claudeHeadingIndex = findHeadingIndex(lines, CLAUDE_INTERPRETATION_HEADINGS, startIndex);
  const endIndex = claudeHeadingIndex === -1 ? lines.length : claudeHeadingIndex;
  const before = trimTrailingBlankLines(lines.slice(0, startIndex));
  const after = trimLeadingBlankLines(lines.slice(endIndex));

  return [
    ...before,
    "",
    ...trimmedBody.split(/\r?\n/),
    "",
    ...after
  ].join("\n");
}

function applyAnalysis(content, analysis) {
  let next = content;
  if (typeof analysis.bodyMarkdown === "string" && analysis.bodyMarkdown.trim().length > 0) {
    next = replaceBodyMarkdown(next, analysis.bodyMarkdown);
  }
  next = replaceSection(next, "Claude 解读", analysis.claudeInterpretation);
  next = replaceSection(next, "歧义点", analysis.ambiguities);
  next = replaceSection(next, "保真差异", analysis.fidelityDiff);
  return next.endsWith("\n") ? next : `${next}\n`;
}

function upsertFrontmatterScalar(lines, key, value) {
  const index = lines.findIndex((line) => new RegExp(`^${key}\\s*:`).test(line.trim()));
  const nextLine = `${key}: ${value}`;
  if (index === -1) {
    return [...lines, nextLine];
  }
  return [...lines.slice(0, index), nextLine, ...lines.slice(index + 1)];
}

export function upsertAnalysisFrontmatter(content, fields) {
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const fieldEntries = [
    ["analysis_input_hash", fields.analysisInputHash],
    ["analysis_applied_at", fields.analysisAppliedAt],
    ["expression_spec", fields.expressionSpec ?? EXPRESSION_SPEC_VERSION]
  ];

  if (!matched) {
    return [
      "---",
      ...fieldEntries.map(([key, value]) => `${key}: ${value}`),
      "---",
      "",
      content.trimStart()
    ].join("\n");
  }

  let frontmatterLines = matched[1].split(/\r?\n/);
  for (const [key, value] of fieldEntries) {
    frontmatterLines = upsertFrontmatterScalar(frontmatterLines, key, value);
  }

  return ["---", ...frontmatterLines, "---", matched[2]].join("\n");
}

function validateAnalysis(value) {
  if (!value || typeof value !== "object") {
    throw new Error("analysis JSON must be an object");
  }
  for (const key of ["claudeInterpretation", "ambiguities", "fidelityDiff"]) {
    if (typeof value[key] !== "string" || value[key].trim().length === 0) {
      throw new Error(`analysis JSON missing non-empty string: ${key}`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(value, "bodyMarkdown")) {
    validateBodyMarkdown(value.bodyMarkdown);
  }
}

export async function findRequirementMarkdown(projectRoot, requirementId) {
  const requirementDir = await resolveDocDirectory(projectRoot, "requirement");
  const files = await listMarkdownFiles(requirementDir);

  for (const filePath of files) {
    const frontmatter = extractFrontmatter(await readFile(filePath, "utf8"));
    if (frontmatter.id === requirementId) {
      return filePath;
    }
  }

  const matched = files.find((file) => basename(file).includes(requirementId));
  if (!matched) {
    throw new Error(`requirement markdown not found: ${requirementId}`);
  }
  return matched;
}

export async function promoteRequirementToPlanning(input) {
  const mdPath = input.canonicalPath
    ? join(input.projectRoot, projectRelativePath(input.projectRoot, input.canonicalPath))
    : await findRequirementMarkdown(input.projectRoot, input.requirementId);
  const canonicalPath = projectRelativePath(input.projectRoot, mdPath);
  const baseHash = input.baseHash ?? sha256(await readFile(mdPath, "utf8"));
  const outcomeId = input.outcomeId ?? input.idempotencyKey ?? `requirement-promote-planning:${input.requirementId}:${baseHash}`;

  return await applyCapabilityOutcome({
    projectRoot: input.projectRoot,
    capabilityId: "requirement.promote",
    outcomeType: "planning",
    outcomeId,
    subjectRef: {
      subject_type: "requirement",
      subject_id: input.requirementId,
      canonical_path: canonicalPath,
      base_hash: baseHash
    },
    expectedHash: baseHash,
    evidence: [
      {
        kind: "A",
        ref: `requirement-md:${canonicalPath}`,
        check_id: "hash_matches",
        params: {
          path: canonicalPath,
          expected_hash: baseHash
        }
      }
    ],
    sourceActor: input.sourceActor ?? "ccb_claude",
    now: input.now
  });
}

export async function applyRequirementAnalysis(input) {
  const mdPath = await findRequirementMarkdown(input.projectRoot, input.requirementId);
  const analysisResult = await withFileLock(mdPath, async () => {
    const before = await readFile(mdPath, "utf8");
    const beforeHash = sha256(before);
    const title = extractTitle(before);
    const description = extractSection(before, "需求描述");
    const analysis = JSON.parse(await readFile(input.analysisFile, "utf8"));
    validateAnalysis(analysis);

    const analysisInputHash = sha256(`${title}${description}`);
    const analysisAppliedAt = new Date().toISOString();
    const next = upsertAnalysisFrontmatter(applyAnalysis(before, analysis), {
      analysisInputHash,
      analysisAppliedAt,
      expressionSpec: EXPRESSION_SPEC_VERSION
    });
    await validateAgainstSchema(next, "requirement-md-frontmatter");
    const writeResult = await safeWriteFile(mdPath, next, {
      expectedHash: beforeHash,
      schemaName: "requirement-md-frontmatter",
      audit: {
        projectRoot: input.projectRoot,
        subjectType: "requirement",
        subjectId: input.requirementId,
        sourceActor: "ccb_claude",
        resourceType: "requirement_md",
        operation: "applyRequirementAnalysis",
        runId: `apply-analysis:${input.requirementId}:${analysisInputHash}`,
        plannedDiff: {
          sections: ["Claude 解读", "歧义点", "保真差异"],
          analysis_input_hash: analysisInputHash
        },
        capabilityRef: "claude_native_requirement_summary"
      }
    });
    const eventResult = await appendEvent(
      {
        type: "file_written",
        subject_type: "requirement",
        subject_id: input.requirementId,
        payload: {
          path: mdPath,
          analysis_input_hash: analysisInputHash,
          file_hash: writeResult.hash
        },
        idempotency_key: `apply-analysis-${input.requirementId}-${analysisInputHash}`,
        emitted_at: analysisAppliedAt,
        source_actor: "ccb_claude"
      },
      { projectRoot: input.projectRoot }
    );

    // --skip-console is retained as a backward-compatible no-op. ADR-0030 makes
    // the requirement markdown frontmatter the handoff source for Console.
    void input.skipConsole;

    return {
      requirement_id: input.requirementId,
      file: mdPath,
      canonical_path: projectRelativePath(input.projectRoot, mdPath),
      file_hash: writeResult.hash,
      title_chars: title.length,
      description_chars: description.length,
      changed: beforeHash !== writeResult.hash,
      analysis_input_hash: analysisInputHash,
      analysis_applied_at: analysisAppliedAt,
      event_journal_appended: eventResult.appended
    };
  });
  const planningPromotion = await promoteRequirementToPlanning({
    projectRoot: input.projectRoot,
    requirementId: input.requirementId,
    canonicalPath: analysisResult.canonical_path,
    baseHash: analysisResult.file_hash,
    sourceActor: "ccb_claude",
    now: analysisResult.analysis_applied_at
  });

  return {
    ...analysisResult,
    planning_promotion: planningPromotion
  };
}
