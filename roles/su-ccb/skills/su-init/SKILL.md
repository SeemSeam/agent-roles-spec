---
name: su-init
description: 初始化项目级 CCB plugin 工作区，使 plugin 可脱离 Console 独立运行。
metadata:
  short-description: CCB 项目初始化
---

# /ccb:su-init

## 1. 指令意图说明

`/ccb:su-init` 用于把一个普通项目初始化为 CCB plugin 可工作的项目。它创建项目内工作记录、索引入口、agent 协作说明和必要目录，让后续 `/ccb:su-flow` 不依赖 Console 也能运行。

## 2. 节点集声明

`su-init` 不直接进入业务节点，但必须安装或校验节点 manifest：

| 节点 | Manifest |
|---|---|
| 需求分析 | `references/kernel/nodes/requirement_analysis.node.md` |
| 技术设计 | `references/kernel/nodes/technical_design.node.md` |
| 任务拆分 | `references/kernel/nodes/task_breakdown.node.md` |
| 派工 | `references/kernel/nodes/dispatch.node.md` |
| 实施 | `references/kernel/nodes/implementation.node.md` |
| 审查 | `references/kernel/nodes/review.node.md` |
| 归档 | `references/kernel/nodes/archive.node.md` |

初始化完成后，用户可直接调用 `/ccb:su-flow` 进入业务节点。

## 3. 触发约定

```text
/ccb:su-init
/ccb:su-init project=<name>
```

运行时先扫描当前目录，确认是否已有 `docs/.ccb/` 和 agent 说明文件。已有文件不得静默覆盖；命中覆盖用户文件时跳过并在摘要中报告。

### init lib 调用契约

收到本指令后必须调用 plugin lib 或同等 CLI，不得手写一套脚手架流程：

```js
import { initProjectScaffold } from "../../lib/su-init/index.mjs";

const result = await initProjectScaffold({ projectRoot });
```

CLI 形式：

```bash
node <plugin>/skills/su-init/scripts/init.mjs --project-root <projectRoot>
```

### 旧项目架构生成

`initProjectScaffold()` 返回的 `summary.architectureCandidates` 是旧项目架构生成的唯一入口判定。不得在 skill 内复制候选发现算法；需要复核时直接从 lib 导入 `detectArchitectureCandidates`。

返回字段按 lib 实际接口消费：

- 顶层：`mode`、`reason`、`candidates`、`overviewTargetPath`、`overviewExisting`、`excluded`、`scopeConflicts`、`existingArchitectureDocs`、`capLimit`。
- 候选：`id`、`path`、`kind`、`disposition`、`confidence`、`evidence`、`targetPath`、`existing`。

处理流程：

1. 先完成 init lib 三步脚手架，再读取 `summary.architectureCandidates`。
2. `mode === "skip"`：不生成架构文档；回执说明 `reason`：
   - `no_source`：未检测到源码候选。
   - `architecture_exists`：`docs/01_架构设计/` 下存在无 `architecture_scope` 的非模板 `.md`，保守跳过。
   同时带上 `existingArchitectureDocs`、`excluded`、`scopeConflicts`（非空时）。
3. `mode === "single"`：只处理 `candidates` 中 `disposition === "generate"` 的候选。若候选 `existing === true`，终态记 `existing`，不写文件；否则进入候选证据门槛，通过后按候选 `targetPath` 生成一份子架构文档。
4. `mode === "layered"`：按候选 `id` 字典序逐个处理。每个 `disposition === "generate"` 且未 existing 的候选独立走证据门槛；不足则终态记 `evidence_insufficient` 并继续其余候选；全部子架构处理完后再生成总架构。
5. `mode === "overview_only"`：不生成子架构；仅按 `overviewTargetPath` 生成总架构，内容包含全部候选清单、`excluded`、`scopeConflicts` 和点名补生成提示。若 `overviewExisting === true`，总架构终态记 `existing`，不得覆盖。
6. `kind === "submodule"` 的候选终态记 `submodule`，只进入总架构清单，不生成子架构；`disposition === "list_only"` 的非 submodule 候选终态记 `list_only`。
7. `excluded` 单独进入回执：`framework_shell_merged` 映射为 `shell_merged`，`root_aggregator` 映射为 `aggregator_excluded`；其它 excluded reason 原样列在 excluded 摘要里。

候选证据门槛：

1. 以候选 `path` 为源码根收集证据，不把其它候选目录的证据混入本候选。
2. 必须拿到候选目录树。
3. 必须至少有 1 类 grounding 源：README、依赖 manifest、入口文件、候选 `evidence` 指向的运行/部署/入口证据、或 SC 结构分析结果。
4. 必须至少能填出「概述」「技术栈」「项目结构」「核心模块 / 入口」四块。
5. 证据不足时不写该候选文件；终态记 `evidence_insufficient`，回执列缺少哪类证据并建议用户手写或点名补充。
6. 证据足够时，优先使用 `/sc:analyze` + `/sc:index-repo` 获取结构证据；SC 不可用时，直接读取 README、入口文件、依赖 manifest、候选 `evidence` 和目录树兜底。

子架构渲染：

1. 按 `templates/docs/01_架构设计/_模板_架构.md` 的章节结构渲染，只填有据章节。
2. 技术栈来自依赖 manifest；项目结构来自目录树；核心模块来自顶层目录、入口文件和 import 关系；概述来自 README 或等价项目说明。
3. 推不出的章节直接省略，包括部署拓扑、外部服务、权限模型、历史意图。正文不得写 TODO、待校正、也不得用 hedge 文本代替证据。
4. 子架构的「覆盖范围 / 不覆盖」必须写清候选 `path`，并在 layered 模式下指向总架构。

scope frontmatter 必须写单行 inline list：

```yaml
---
doc_type: architecture
updated: YYYY-MM-DD
generated_by: su-init-ai
human_verified: false
architecture_scope: <子系统 slug>
scope_source_roots: ["apps/web", "src-tauri"]
---
```

总架构固定使用：

```yaml
---
doc_type: architecture
updated: YYYY-MM-DD
generated_by: su-init-ai
human_verified: false
architecture_scope: overview
scope_source_roots: ["."]
---
```

`architecture_scope: 子系统 slug;系统总架构固定为 overview。`
`scope_source_roots: 仓库相对路径数组,必须写单行 inline list,如 ["apps/web", "src-tauri"]。`
`不要写多行 YAML 数组,行级 parser 会 partial。`

不得写 `status` 字段，不得生成 02_需求、04_模块规格等其它文档。

总架构固定渲染 profile：

1. 只填 `_模板_架构.md` 的固定章节：一、二、五、六、十一。
2. 一「概述与定位」写系统全景和本次候选发现边界。
3. 二「整体结构」写子系统框图，只画有证据的连线。
4. 五「核心模块」必须是全部候选清单表，列：子系统、路径、职责、置信度、状态、文档链接。
5. 六「关键流程」只写可证实关联：import 方向、HTTP client 指向、配置引用。推不出时写「未推断」。
6. 十一「相关文档」只链接本轮实际写成功或已存在的子架构；不得链接失败、跳过或未写的目标。
7. 不得编造子系统关联；总架构可列候选事实和缺口，但不能把推测关系写成事实。

写盘纪律：

1. 写盘前必须二次检测：

```js
import { detectArchitectureCandidates } from "../../lib/su-init/index.mjs";

const latest = await detectArchitectureCandidates({ projectRoot });
```

2. 二次检测只因新增「无 `architecture_scope` 的非模板架构 md」中止；本轮已写入的 scoped 文档会在后续检测中表现为 `existing`，不算形状变化。
3. 子架构先写，按候选 `id` 字典序逐个 final-path 写入；总架构最后写。
4. 每个文件只能写 lib 返回的 `targetPath` 或 `overviewTargetPath`。目标路径是项目内相对路径，写盘时拼到 `projectRoot` 下。
5. 必须使用 final path 独占创建，例如：

```js
await writeFile(targetPath, content, { encoding: "utf8", flag: "wx" });
```

或等价的 `open(targetPath, "wx")`。禁止使用 `safeWriteFile` 或任何 temp + rename helper，因为 final rename 可能覆盖竞态文件。
6. 如果单文件写盘返回 `EEXIST` 或失败，该文件终态记 `skipped` 并说明原因，继续其余候选；不得覆盖、不得重试改名。
7. 若补写了新子架构但 `overviewExisting === true`，不得改旧总架构；回执必须提示总架构可能缺少新链接，建议用户对话补改。

回执契约：

1. 每个候选必须给终态：`generated`、`existing`、`evidence_insufficient`、`list_only`、`submodule`、`shell_merged`、`aggregator_excluded`。
2. 总架构状态只用：`generated`、`existing`；未尝试生成时说明原因。
3. 生成时醒目标明「AI 生成、建议 review、要改直接对话」，列出写入路径和 evidence sources 摘要（目录树、README、manifest、入口文件、候选 evidence、SC 结果等实际使用项）。
4. 跳过时列出 `mode`、`reason`、`existingArchitectureDocs`、`scopeConflicts`、`excluded`（非空时）。
5. `overview_only` 必须列全部候选和点名补生成指引；超出 `capLimit` 时说明本轮只生成总架构。

## 4. Plugin 独立运行约定

初始化的目标是让项目没有 Console 也能工作。至少创建或校验：

1. `docs/00_项目总览.md`
2. `docs/01_架构设计/` ~ `docs/06_决策记录/`、`docs/99_归档/`
3. 各 docs 目录下的 `_模板_*.md`
4. `docs/.ccb/docs-structure-contract.yaml`
5. `docs/.ccb/index/`
6. `docs/.ccb/events/journal.jsonl`
7. `docs/.ccb/locks/`
8. `docs/.ccb/drafts/breakdown/`
9. `docs/.ccb/schemas/`
10. `docs/.ccb/config/`
11. `CLAUDE.md` / `AGENTS.md` / `.claude/settings.json` 协作说明，按项目实际存在情况处理

`docs/00_文档地图.md` 由 indexer 自动生成，`su-init` 不手填。

不得调用 Console 业务写入接口初始化业务状态。

## 5. 强协商与 sc 要求

`su-init` 是管理指令，不强制进入业务节点协商。但如果初始化过程中需要决定项目结构、覆盖文件、引入外部服务或改变用户已有配置，必须按必问清单问用户。

建议使用：

1. `/sc:analyze --focus project-structure .`
2. `/sc:research <项目技术栈>`（需要判断技术栈时）

sc 不可用时，说明替代扫描方式。

## 6. 用户可见输出

输出初始化摘要、创建/保留/跳过的文件、未覆盖原因、下一步建议和可直接运行的 `/ccb:su-flow` 示例。

若触发旧项目架构生成流程，回执还必须包含：

- 生成时：醒目标明「AI 生成、建议 review、要改直接对话」，列出子架构路径、总架构路径和 evidence sources 摘要（目录树、README、manifest、入口文件、候选 evidence、SC 结果等实际使用项）。
- 跳过时：列出 `architectureCandidates.mode` / `reason`，并带上 `existingArchitectureDocs`、`scopeConflicts`、`excluded`（非空时）。
- 分层处理时：逐候选列出 `id`、`path`、`kind`、`disposition`、`confidence`、终态和文档路径；证据不足使用 `evidence_insufficient` 并列缺少哪类证据；目标文件竞态存在时说明 `EEXIST` / 已存在且未覆盖。
- `overview_only` 时：列全部候选、总架构状态、超限或全 list-only 原因，以及可点名补生成的候选 `id`。
