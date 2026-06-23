import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { ValidationError } from "../../runtime/index.mjs";
import { applyRequirementAnalysis, promoteRequirementToPlanning } from "../index.mjs";

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

async function readEvents(projectRoot) {
  try {
    const journal = await readFile(join(projectRoot, "docs", ".ccb", "events", "journal.jsonl"), "utf8");
    return journal.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

function countMatches(content, pattern) {
  return (content.match(pattern) ?? []).length;
}

// 统一 helper：第 3 参为数组 → 显式 lines（bodyMarkdown 测试）；为字符串 → 按 status 套固定模板（promotion 测试）。
async function writeRequirementMarkdown(root, requirementId, statusOrLines) {
  const requirementDir = join(root, "docs", "02_需求设计");
  await mkdir(requirementDir, { recursive: true });
  if (Array.isArray(statusOrLines)) {
    const mdPath = join(requirementDir, `${requirementId}-需求.md`);
    await writeFile(mdPath, statusOrLines.join("\n"), "utf8");
    return mdPath;
  }
  const mdPath = join(requirementDir, "需求详情页的优化-07ae88-需求.md");
  await writeFile(mdPath, [
    "---",
    "doc_type: requirement",
    `id: ${requirementId}`,
    `status: ${statusOrLines}`,
    "title: 需求详情页优化",
    "---",
    "",
    "## 需求描述",
    "",
    "详情页需要展示 AI 解析产物。",
    ""
  ].join("\n"), "utf8");
  return mdPath;
}

// 统一 helper：默认写固定分析内容到 analysis.json（promotion 测试）；可显式传 name + analysis（bodyMarkdown 测试）。
async function writeAnalysisFile(root, name = "analysis.json", analysis = {
  claudeInterpretation: "需求要求把分析结果投影到详情页。",
  ambiguities: "没有额外歧义。",
  fidelityDiff: "与原始描述一致。"
}) {
  const analysisFile = join(root, name);
  await writeFile(analysisFile, JSON.stringify(analysis), "utf8");
  return analysisFile;
}

test("applyRequirementAnalysis finds requirement markdown by frontmatter id when filename only keeps id suffix", async () => {
  const root = await mkdtemp(join(tmpdir(), "ccb-requirement-analysis-lib-"));
  try {
    const requirementId = "cmph5nd2va01cb8b41e07ae88";
    const mdPath = await writeRequirementMarkdown(root, requirementId, "drafting");
    const analysisFile = await writeAnalysisFile(root);

    const result = await applyRequirementAnalysis({ projectRoot: root, requirementId, analysisFile });
    const updated = await readFile(mdPath, "utf8");
    const frontmatter = parseFrontmatter(updated);
    const expectedHash = sha256("需求详情页优化详情页需要展示 AI 解析产物。");

    assert.equal(result.requirement_id, requirementId);
    assert.equal(result.file, mdPath);
    assert.equal(frontmatter.analysis_input_hash, expectedHash);
    assert.equal(frontmatter.expression_spec, "v1");
    assert.equal(frontmatter.status, "planning");
    assert.equal(result.planning_promotion.ok, true);
    assert.equal(result.planning_promotion.policy_id, "requirement.promote:planning:requirement");
    assert.match(updated, /## Claude 解读\n\n需求要求把分析结果投影到详情页。/);
    assert.match(updated, /## 歧义点\n\n没有额外歧义。/);
    assert.match(updated, /## 保真差异\n\n与原始描述一致。/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("promoteRequirementToPlanning locates requirement markdown for su-flow entry promotion", async () => {
  const root = await mkdtemp(join(tmpdir(), "ccb-requirement-analysis-lib-"));
  try {
    const requirementId = "cmph5nd2va01cb8b41e07ae88";
    const mdPath = await writeRequirementMarkdown(root, requirementId, "drafting");

    const result = await promoteRequirementToPlanning({ projectRoot: root, requirementId });
    const updated = await readFile(mdPath, "utf8");
    const frontmatter = parseFrontmatter(updated);
    const events = await readEvents(root);

    assert.equal(result.ok, true);
    assert.equal(frontmatter.status, "planning");
    assert.equal(frontmatter.expression_spec, undefined);
    assert.match(result.outcome_id, new RegExp(`^requirement-promote-planning:${requirementId}:[a-f0-9]{64}$`));
    assert.equal(
      events.filter((event) => event.idempotency_key === `capability-outcome:${result.outcome_id}:applied`).length,
      1
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("applyRequirementAnalysis writes optional bodyMarkdown between verbatim and Claude sections", async () => {
  const root = await mkdtemp(join(tmpdir(), "ccb-requirement-analysis-lib-"));
  try {
    const requirementId = "cmpr-bodymarkdown-write";
    const mdPath = await writeRequirementMarkdown(root, requirementId, [
      "---",
      "doc_type: requirement",
      `id: ${requirementId}`,
      "title: 需求文档 C 结构",
      "---",
      "",
      "# 需求文档 C 结构 需求设计",
      "",
      "## 需求描述",
      "",
      "让 AI 解析产物按模板主体输出。",
      "",
      "## 原话（verbatim）",
      "",
      "用户要求需求文档按模板模块产出。",
      "",
      "## Claude 解读",
      "",
      "旧解读",
      "",
      "## 歧义点",
      "",
      "旧歧义",
      "",
      "## 保真差异",
      "",
      "旧差异",
      ""
    ]);
    const analysisFile = await writeAnalysisFile(root, "analysis.json", {
      bodyMarkdown: [
        "## 二、背景与目标",
        "",
        "- **背景**: 旧 5 段结构不满足模板模块。",
        "- **目标**: 主体按需求模板展开。",
        "",
        "## 四、功能 / 范围",
        "",
        "- 需求分析产物包含人读主体。",
        "- 文末保留投影锚点。"
      ].join("\n"),
      claudeInterpretation: "主体按模板输出，文末三锚点作为摘要投影。",
      ambiguities: "无新增歧义。",
      fidelityDiff: "与用户原话一致。"
    });

    await applyRequirementAnalysis({ projectRoot: root, requirementId, analysisFile });
    const updated = await readFile(mdPath, "utf8");

    const verbatimIndex = updated.indexOf("## 原话（verbatim）");
    const bodyIndex = updated.indexOf("## 二、背景与目标");
    const claudeIndex = updated.indexOf("## Claude 解读");
    const ambiguityIndex = updated.indexOf("## 歧义点");
    const fidelityIndex = updated.indexOf("## 保真差异");

    assert.ok(verbatimIndex !== -1, "expected verbatim section");
    assert.ok(bodyIndex > verbatimIndex, "expected bodyMarkdown after verbatim section");
    assert.ok(claudeIndex > bodyIndex, "expected Claude section after bodyMarkdown");
    assert.ok(ambiguityIndex > claudeIndex, "expected ambiguities after Claude section");
    assert.ok(fidelityIndex > ambiguityIndex, "expected fidelity diff after ambiguities");
    assert.match(updated, /## Claude 解读\n\n主体按模板输出，文末三锚点作为摘要投影。/);
    assert.match(updated, /## 歧义点\n\n无新增歧义。/);
    assert.match(updated, /## 保真差异\n\n与用户原话一致。/);
    assert.doesNotMatch(updated, /旧解读|旧歧义|旧差异/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("promoteRequirementToPlanning is idempotent across repeated su-flow entry triggers", async () => {
  const root = await mkdtemp(join(tmpdir(), "ccb-requirement-analysis-lib-"));
  try {
    const requirementId = "cmph5nd2va01cb8b41e07ae88";
    const mdPath = await writeRequirementMarkdown(root, requirementId, "drafting");

    const first = await promoteRequirementToPlanning({ projectRoot: root, requirementId });
    const second = await promoteRequirementToPlanning({ projectRoot: root, requirementId });
    const updated = await readFile(mdPath, "utf8");
    const frontmatter = parseFrontmatter(updated);
    const events = await readEvents(root);

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(second.noop, true);
    assert.equal(frontmatter.status, "planning");
    assert.equal(events.filter((event) => event.type === "capability_outcome_applied").length, 1);
    assert.equal(
      events.filter((event) => event.type === "state_write_intent" && event.payload?.operation === "applyCapabilityOutcome").length,
      1
    );
    assert.equal(
      events.filter((event) => event.type === "state_write_done").length,
      1
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("applyRequirementAnalysis replaces bodyMarkdown idempotently and keeps analysis input hash stable", async () => {
  const root = await mkdtemp(join(tmpdir(), "ccb-requirement-analysis-lib-"));
  try {
    const requirementId = "cmpr-bodymarkdown-idempotent";
    const mdPath = await writeRequirementMarkdown(root, requirementId, [
      "---",
      "doc_type: requirement",
      `id: ${requirementId}`,
      "title: 重跑需求分析",
      "---",
      "",
      "## 需求描述",
      "",
      "重复运行分析时主体区应该整段替换。",
      "",
      "## 原话（verbatim）",
      "",
      "请让重跑不重复插入模板主体。",
      "",
      "## 二、背景与目标",
      "",
      "待替换主体。",
      "",
      "## Claude 解读",
      "",
      "旧解读",
      ""
    ]);
    const firstAnalysisFile = await writeAnalysisFile(root, "analysis-1.json", {
      bodyMarkdown: [
        "## 二、背景与目标",
        "",
        "第一次主体。",
        "",
        "## 三、讨论与决策",
        "",
        "第一次决策。"
      ].join("\n"),
      claudeInterpretation: "第一次摘要。",
      ambiguities: "第一次歧义。",
      fidelityDiff: "第一次差异。"
    });
    const secondAnalysisFile = await writeAnalysisFile(root, "analysis-2.json", {
      bodyMarkdown: [
        "## 二、背景与目标",
        "",
        "第二次主体。",
        "",
        "## 五、业务规则",
        "",
        "第二次规则。"
      ].join("\n"),
      claudeInterpretation: "第二次摘要。",
      ambiguities: "第二次歧义。",
      fidelityDiff: "第二次差异。"
    });

    const firstResult = await applyRequirementAnalysis({ projectRoot: root, requirementId, analysisFile: firstAnalysisFile });
    const secondResult = await applyRequirementAnalysis({ projectRoot: root, requirementId, analysisFile: secondAnalysisFile });
    const updated = await readFile(mdPath, "utf8");
    const frontmatter = parseFrontmatter(updated);
    const expectedHash = sha256("重跑需求分析重复运行分析时主体区应该整段替换。");

    assert.equal(firstResult.analysis_input_hash, expectedHash);
    assert.equal(secondResult.analysis_input_hash, expectedHash);
    assert.equal(frontmatter.analysis_input_hash, expectedHash);
    assert.equal(frontmatter.expression_spec, "v1");
    assert.equal(countMatches(updated, /^expression_spec:\s*v1$/gm), 1);
    assert.doesNotMatch(updated, /待替换主体|第一次主体|第一次决策|第一次摘要/);
    assert.match(updated, /第二次主体。/);
    assert.match(updated, /第二次规则。/);
    assert.match(updated, /## Claude 解读\n\n第二次摘要。/);
    assert.equal(countMatches(updated, /^## 二、背景与目标$/gm), 1);
    assert.equal(countMatches(updated, /^## Claude 解读$/gm), 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("applyRequirementAnalysis affirms current planning requirement as promotion no-op", async () => {
  const root = await mkdtemp(join(tmpdir(), "ccb-requirement-analysis-lib-"));
  try {
    const requirementId = "cmph5nd2va01cb8b41e07ae88";
    const mdPath = await writeRequirementMarkdown(root, requirementId, "planning");
    const analysisFile = await writeAnalysisFile(root);

    const result = await applyRequirementAnalysis({ projectRoot: root, requirementId, analysisFile });
    const updated = await readFile(mdPath, "utf8");
    const frontmatter = parseFrontmatter(updated);
    const events = await readEvents(root);

    assert.equal(frontmatter.status, "planning");
    assert.equal(result.planning_promotion.ok, true);
    assert.equal(result.planning_promotion.noop, true);
    assert.equal(events.filter((event) => event.type === "capability_outcome_applied").length, 0);
    assert.equal(
      events.filter((event) => event.type === "state_write_intent" && event.payload?.operation === "applyCapabilityOutcome").length,
      0
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("applyRequirementAnalysis does not downgrade non-forward requirement statuses", async () => {
  for (const status of ["delivering", "delivered", "deferred", "cancelled"]) {
    const root = await mkdtemp(join(tmpdir(), "ccb-requirement-analysis-lib-"));
    try {
      const requirementId = "cmph5nd2va01cb8b41e07ae88";
      const mdPath = await writeRequirementMarkdown(root, requirementId, status);
      const analysisFile = await writeAnalysisFile(root);

      const result = await applyRequirementAnalysis({ projectRoot: root, requirementId, analysisFile });
      const updated = await readFile(mdPath, "utf8");
      const frontmatter = parseFrontmatter(updated);

      assert.equal(frontmatter.status, status);
      assert.equal(result.planning_promotion.ok, false);
      assert.equal(result.planning_promotion.code, "GUARD_FAILED");
      assert.match(result.planning_promotion.issues.join("\n"), new RegExp(`cannot override ${status}`));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("applyRequirementAnalysis rejects bodyMarkdown containing reserved parser headings", async () => {
  const reservedHeadings = [
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

  for (const [index, heading] of reservedHeadings.entries()) {
    const root = await mkdtemp(join(tmpdir(), "ccb-requirement-analysis-lib-"));
    try {
      const requirementId = `cmpr-reserved-${index}`;
      const mdPath = await writeRequirementMarkdown(root, requirementId, [
        "---",
        "doc_type: requirement",
        `id: ${requirementId}`,
        "title: 保留锚点检测",
        "---",
        "",
        "## 需求描述",
        "",
        "主体不能污染 parser 锚点。",
        "",
        "## 原话（verbatim）",
        "",
        "原话。",
        ""
      ]);
      const before = await readFile(mdPath, "utf8");
      const analysisFile = await writeAnalysisFile(root, "analysis.json", {
        bodyMarkdown: `## ${heading}\n\n污染投影。`,
        claudeInterpretation: "摘要。",
        ambiguities: "歧义。",
        fidelityDiff: "差异。"
      });

      await assert.rejects(
        applyRequirementAnalysis({ projectRoot: root, requirementId, analysisFile }),
        ValidationError
      );
      assert.equal(await readFile(mdPath, "utf8"), before);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

test("applyRequirementAnalysis rejects non-string bodyMarkdown", async () => {
  const root = await mkdtemp(join(tmpdir(), "ccb-requirement-analysis-lib-"));
  try {
    const requirementId = "cmpr-bodymarkdown-non-string";
    await writeRequirementMarkdown(root, requirementId, [
      "---",
      "doc_type: requirement",
      `id: ${requirementId}`,
      "title: bodyMarkdown 类型校验",
      "---",
      "",
      "## 需求描述",
      "",
      "bodyMarkdown 必须是字符串。",
      "",
      "## 原话（verbatim）",
      "",
      "原话。",
      ""
    ]);
    const analysisFile = await writeAnalysisFile(root, "analysis.json", {
      bodyMarkdown: 123,
      claudeInterpretation: "摘要。",
      ambiguities: "歧义。",
      fidelityDiff: "差异。"
    });

    await assert.rejects(
      applyRequirementAnalysis({ projectRoot: root, requirementId, analysisFile }),
      ValidationError
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
