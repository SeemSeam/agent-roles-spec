---
name: requirement-reanalyze
description: 重新分析 Requirement 原文和已生成人读设计/任务文档，修正理解漂移。
metadata:
  short-description: Requirement 重新分析
---

# /ccb:requirement-reanalyze

## 1. 指令意图说明

`requirement-reanalyze` 用于当用户、Claude 或 Codex 发现需求理解可能跑偏，或需求内容本身被用户变更 / 扩张时，重新进入需求分析。它不只是刷新摘要，而是重新质疑 framing、歧义、用户必问项和已有设计 / dev_task 文档。

本 skill 同时处理两类场景：① 理解漂移（对同一内容的旧判断纠偏）；② 需求内容变更 / 新增（以新内容重推范围）。两类都遵守**范围非锚定**：以用户最新完整原文为准，旧设计 / dev_task 只作历史证据、不绑定新增内容；必须先核验当前代码 / 事实，再判断新范围是否仍命中既有 API / schema / 依赖 / 成本 / 合规约束，并明确哪些旧结论保留、哪些被推翻、哪些需进入 technical_design 或 task_breakdown。禁止用旧边界给新增内容设准入门槛，也禁止凭未核验假设放大 / 缩小范围。

## 2. 节点集声明

主要进入：

| 节点 | Manifest |
|---|---|
| 需求分析 | `references/kernel/nodes/requirement_analysis.node.md` |

可能继续：

| 场景 | 下一节点 |
|---|---|
| 需求重新澄清后需要改方案 | `references/kernel/nodes/technical_design.node.md` |
| 只影响拆分 | `references/kernel/nodes/task_breakdown.node.md` |

## 3. 触发约定

```text
/ccb:requirement-reanalyze requirement_id=<id>
/ccb:requirement-reanalyze docs/02_需求设计/foo.md
```

如果已有设计 / dev_task 与用户原文冲突，以用户原文和用户最新决定为更高优先级。

## 4. Plugin 独立运行约定

启动时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。直接读取经 resolver 定位的 requirement 文档、关联 technical_design / dev_task 文档、breakdown draft 和 EventJournal。修订后的分析写回 requirement markdown，并在 frontmatter 写入：

1. `analysis_input_hash`：本次分析对应的 title + 需求描述 hash。
2. `analysis_applied_at`：本次主动应用分析的 ISO8601 时间戳。

Console 如存在，只通过 file watcher 解析这些 frontmatter 字段并投影到 DB；本 skill 不调用 Console HTTP API。

修订分析必须写入 `analysisFile` JSON 后调用 `applyRequirementAnalysis({ projectRoot, requirementId, analysisFile })`。`analysisFile` 必填非空字符串字段：`claudeInterpretation`、`ambiguities`、`fidelityDiff`；可选字符串字段 `bodyMarkdown` 用于按需求模板主体产出二~十三章（复杂度自适应，用不上的章节可删）。`bodyMarkdown` 不得包含以下二级标题：`需求描述`、`原话（verbatim）`、`原话`、`verbatim`、`Claude 解读`、`Claude 解读（可选）`、`歧义点`、`歧义点（可选）`、`保真差异`、`保真差异（可选）`。提供 `bodyMarkdown` 时，lib 会以 O2 语义整段替换「原话 section 后 ~ Claude 解读 section 前」的主体区；未提供时保持旧三锚点写入路径。严禁绕过 lib 直接写 requirement markdown。

## 5. 强协商与 sc 要求

必须执行需求分析节点的 sc 和协商要求。特别要求 Codex 对比“旧理解 vs 新原文”，指出是否存在 semantic drift。

## 6. 用户可见输出

输出漂移点、保留不变的结论、已在终端问到答案并闭环记录的用户拍板项、写入路径和后续节点建议；若仍有命中项未获答复，先停在当前终端等待答案，不落档。
