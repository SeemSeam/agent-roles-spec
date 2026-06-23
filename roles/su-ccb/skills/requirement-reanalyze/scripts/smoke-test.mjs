#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { resolveDocType } from "../../../lib/docs-structure/index.mjs";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const applyScript = join(scriptDir, "apply-analysis.mjs");

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function parseFrontmatter(content) {
  const matched = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(matched, "expected markdown frontmatter");
  return Object.fromEntries(
    matched[1]
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const index = line.indexOf(":");
        assert.notEqual(index, -1, `frontmatter line should contain ':' (${line})`);
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "")];
      })
  );
}

function assertAppliedFrontmatter(content, expectedHash) {
  const frontmatter = parseFrontmatter(content);
  assert.equal(frontmatter.analysis_input_hash, expectedHash);
  assert.ok(frontmatter.analysis_applied_at, "expected analysis_applied_at");
  assert.doesNotThrow(() => new Date(frontmatter.analysis_applied_at).toISOString());
}

async function readJournalEvents(root) {
  const journal = await readFile(join(root, "docs", ".ccb", "events", "journal.jsonl"), "utf8");
  return journal
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function assertFileWrittenEvent(event, requirementId, expectedHash) {
  assert.equal(event.type, "file_written");
  assert.equal(event.subject_type, "requirement");
  assert.equal(event.subject_id, requirementId);
  assert.equal(event.payload.analysis_input_hash, expectedHash);
  assert.equal(event.idempotency_key, `apply-analysis-${requirementId}-${expectedHash}`);
  assert.equal(event.source_actor, "ccb_claude");
  assert.doesNotThrow(() => new Date(event.emitted_at).toISOString());
}

async function main() {
  const root = await mkdtemp(join(tmpdir(), "ccb-requirement-reanalyze-skill-"));
  try {
    const requirementDocType = await resolveDocType("requirement");
    const requirementDir = join(root, requirementDocType.directory);
    await mkdir(requirementDir, { recursive: true });
    const requirementId = "req-smoke-1";
    const mdPath = join(requirementDir, `2026-05-17-${requirementId}.md`);
    await writeFile(mdPath, [
      "---",
      `id: ${requirementId}`,
      "title: Smoke Requirement",
      "doc_type: requirement",
      "---",
      "",
      "## 需求描述",
      "",
      "用户希望重新解析后 AI 产物跟随最新描述。",
      "",
      "## Claude 解读",
      "",
      "Old interpretation.",
      "",
      "## 歧义点",
      "",
      "Old ambiguity.",
      "",
      "## 保真差异",
      "",
      "Old diff.",
      ""
    ].join("\n"), "utf8");

    const analysisFile = join(root, "analysis.json");
    await writeFile(analysisFile, JSON.stringify({
      claudeInterpretation: "新的解读：需求要求刷新 AI 解析内容。",
      ambiguities: "没有额外歧义。",
      fidelityDiff: "保真差异已基于最新 title/description 重新计算。"
    }), "utf8");

    const { stdout } = await execFileAsync(process.execPath, [
      applyScript,
      "--requirement-id",
      requirementId,
      "--project-root",
      root,
      "--analysis-file",
      analysisFile
    ]);

    const updated = await readFile(mdPath, "utf8");
    const expectedHash = sha256("Smoke Requirement用户希望重新解析后 AI 产物跟随最新描述。");
    assert.match(stdout, /\[CCB_TASK_COMPLETED\]/);
    assert.match(updated, /新的解读/);
    assert.match(updated, /没有额外歧义/);
    assert.match(updated, /保真差异已基于最新/);
    assert.doesNotMatch(updated, /Old interpretation/);
    assertAppliedFrontmatter(updated, expectedHash);
    assert.match(stdout, new RegExp(`"analysis_input_hash":"${expectedHash}"`));
    assert.match(stdout, /"event_journal_appended":true/);

    const firstEvents = await readJournalEvents(root);
    assert.deepEqual(firstEvents.map((event) => event.type), [
      "state_write_intent",
      "state_write_done",
      "file_written"
    ]);
    assert.equal(firstEvents[0].payload.resource_type, "requirement_md");
    assertFileWrittenEvent(firstEvents[2], requirementId, expectedHash);

    const secondRequirementId = "req-smoke-2";
    const secondPath = join(requirementDir, `2026-05-17-${secondRequirementId}.md`);
    // 无 frontmatter 历史需求:findRequirementMarkdown 靠文件名(含 requirementId)定位,
    // apply-analysis 应为其新建 frontmatter 并写入 analysis hash。
    await writeFile(secondPath, [
      "# No Frontmatter Requirement",
      "",
      "## 需求描述",
      "",
      "没有 frontmatter 的历史需求也要能写入分析 hash。",
      "",
      "## Claude 解读",
      "",
      "Old interpretation.",
      ""
    ].join("\n"), "utf8");

    await execFileAsync(process.execPath, [
      applyScript,
      "--requirement-id",
      secondRequirementId,
      "--project-root",
      root,
      "--analysis-file",
      analysisFile,
      "--skip-console"
    ]);

    const secondUpdated = await readFile(secondPath, "utf8");
    const secondExpectedHash = sha256("No Frontmatter Requirement没有 frontmatter 的历史需求也要能写入分析 hash。");
    assert.match(secondUpdated, /^---\nanalysis_input_hash:/);
    assertAppliedFrontmatter(secondUpdated, secondExpectedHash);

    const events = await readJournalEvents(root);
    assert.deepEqual(events.map((event) => event.type), [
      "state_write_intent",
      "state_write_done",
      "file_written",
      "state_write_intent",
      "state_write_done",
      "file_written"
    ]);
    assert.equal(events[3].payload.resource_type, "requirement_md");
    assertFileWrittenEvent(events[5], secondRequirementId, secondExpectedHash);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
