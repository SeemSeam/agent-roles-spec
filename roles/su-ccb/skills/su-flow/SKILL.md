---
name: su-flow
description: CCB 主流程入口：按用户意图在 7 个节点中选择工作模式，推进需求分析、设计、拆分或后续执行。
metadata:
  short-description: CCB AI 编排主入口
---

# /ccb:su-flow

## 1. 指令意图说明

`/ccb:su-flow` 是用户把目标交给 AI 团队的主入口。它不是固定流水线命令，而是让 Claude 根据用户意图、当前文件和已有状态，选择合适节点并推进工作。

典型用户意图：

1. “帮我分析这个需求”
2. “继续做技术设计”
3. “把这个需求拆成任务”
4. “按这个 spec 往下推进”
5. “从 review 回退后重新规划”

Claude 必须先判断当前该进入哪个节点，再读取对应 manifest。不要把本 SKILL.md 当作节点内执行规则。

## 2. 节点集声明

本指令可调用完整 7 节点集：

| 节点 | Manifest |
|---|---|
| 需求分析 | `references/kernel/nodes/requirement_analysis.node.md` |
| 技术设计 | `references/kernel/nodes/technical_design.node.md` |
| 任务拆分 | `references/kernel/nodes/task_breakdown.node.md` |
| 派工 | `references/kernel/nodes/dispatch.node.md` |
| 实施 | `references/kernel/nodes/implementation.node.md` |
| 审查 | `references/kernel/nodes/review.node.md` |
| 归档 | `references/kernel/nodes/archive.node.md` |

进入任一业务节点后，必须遵守该节点 manifest 的 6 章节规则：进入条件、核心要点、完成条件、硬约束、sc 推荐和三档样例。

## 3. 触发约定

支持自然语言和显式参数两种入口：

```text
/ccb:su-flow 帮我分析 docs/02_需求设计/foo.md
/ccb:su-flow --payload {"subject":"requirement","requirement_id":"<id>","step":"analysis"}
/ccb:su-flow --payload {"subject":"requirement","requirement_id":"<id>","step":"design"}
/ccb:su-flow --payload {"subject":"requirement","requirement_id":"<id>","step":"breakdown_draft"}
/ccb:su-flow --payload {"subject":"subtask","task_id":"<id>","step":"execution"}
```

payload 只用于帮助定位主体和用户意图，不代表固定步骤。即使传了 `payload.step="design"`，如果需求仍有歧义，也必须先回到需求分析。

Console 可以把用户点击转换成 `--payload` JSON 命令投递到 anchor；Console 是触发器，不是业务写入者。

### artifact projection 契约

节点产物必须落到 Console 实际投影读取的位置；不得只写临时 spec 后声称完成。

| 节点 | canonical 产物 | 完成后动作 |
|---|---|---|
| `requirement_analysis` | 经 docs-structure resolver 定位的 requirement 文档（当前契约为 `docs/02_需求设计/`）里的 `## 需求描述` / `## 原话（verbatim）` + 可选模板主体 + `## Claude 解读` / `## 歧义点` / `## 保真差异` + frontmatter `analysis_input_hash` | 节点入口先调用 `promoteRequirementToPlanning({ projectRoot, requirementId })`；把分析结果写入 JSON 文件后调用 `applyRequirementAnalysis({ projectRoot, requirementId, analysisFile })`，该 lib 会在分析成功后再次 affirm planning |
| `technical_design` | 经 resolver 定位的 technical_design 文档（当前契约为 `docs/03_开发计划/`） | 技术设计文档 frontmatter 必须写 `doc_type: technical_design` 与 `requirement_id: <requirementId>`，正文非空 |
| `task_breakdown` | `docs/.ccb/drafts/breakdown/<requirementId>.json` | 使用 breakdown-draft action 契约 |

调用前 import：

```js
import {
  applyRequirementAnalysis,
  promoteRequirementToPlanning
} from "../../lib/requirement-analysis/index.mjs";
```

进入 `requirement_analysis` 或 `technical_design` 节点后，只要已定位 `requirementId`，必须先执行：

```js
await promoteRequirementToPlanning({ projectRoot, requirementId });
```

该调用通过 `requirement.promote:planning` capability outcome 写 canonical requirement md，幂等 key 由 `<requirementId>:<baseHash>` 派生；`planning` 会 no-op，`delivering` / `delivered` / `deferred` / `cancelled` 或 hash 冲突会被 guard 拒绝。拒绝时不得手写 `status`，记录返回的 `code` / `issues`，再按节点 manifest 判断继续、停止或升级用户。

`analysisFile` 必须是 JSON，字段为非空字符串：`claudeInterpretation`、`ambiguities`、`fidelityDiff`；可选字段 `bodyMarkdown` 为字符串，用于按需求模板主体产出二~十三章（复杂度自适应，用不上的章节可删）。`ambiguities` 必须写闭环形态：已问已答的拍板记录（含答案与理由）或显式移交下一节点的技术项；不得把未获答复的问题写成"待用户××"。命中未决用户拍板项时，不调用 `applyRequirementAnalysis`，先在当前终端问到答案。`bodyMarkdown` 不得包含以下二级标题：`需求描述`、`原话（verbatim）`、`原话`、`verbatim`、`Claude 解读`、`Claude 解读（可选）`、`歧义点`、`歧义点（可选）`、`保真差异`、`保真差异（可选）`。提供 `bodyMarkdown` 时，`applyRequirementAnalysis` 会以 O2 语义整段替换「原话 section 后 ~ Claude 解读 section 前」的主体区；未提供时保持旧三锚点写入路径。严禁在 anchor 内用 `fs.writeFile` 直接改 requirement md 的分析 section；必须走 lib 的 safeWriteFile/CAS/EventJournal 路径。

### breakdown-draft action 契约

当 payload 携带 `action=breakdown_draft_*` 时，Claude 必须把 JSON payload 解析为 lib 调用，不得自由手写 JSON：

| action | 必填参数 | 调用 |
|---|---|---|
| `breakdown_draft_create` | `requirement_id` | `createBreakdownDraft({ projectRoot, requirementId, draftPayload })` |
| `breakdown_draft_update` | `requirement_id`, `expected_hash` | `updateBreakdownDraft({ projectRoot, requirementId, patch, expectedHash })` |
| `breakdown_draft_begin_review` | `requirement_id`, `expected_hash` | `transitionBreakdownDraftStatus({ projectRoot, requirementId, expectedHash, fromStatus: "draft", toStatus: "reviewing" })` |
| `derive_followup` | `requirement_id`, `followup.type`, `followup.title`, `source_task_id`, `source_task_key` | `deriveFollowupBreakdownDraft(...)` 后按 approved hash 调用 `transitionBreakdownDraftStatus(... toStatus: "consumed")` 与 `materializeRequirement(...)` |

调用前 import：

```js
import {
  createBreakdownDraft,
  deriveFollowupBreakdownDraft,
  readBreakdownDraft,
  updateBreakdownDraft,
  transitionBreakdownDraftStatus
} from "../../lib/breakdown-draft/index.mjs";
import { materializeRequirement } from "../../lib/subtask/index.mjs";
```

`derive_followup` 使用 reopen 新代次语义：先 `readBreakdownDraft()` 获取当前 hash；若 draft 已 `consumed`，用 `transitionBreakdownDraftStatus({ fromStatus: "consumed", toStatus: "draft" })` 重开；再通过 `updateBreakdownDraft()` 追加一条 follow-up subtask。新 subtask 的 `order = max(order)+1`、`section_id = pr<order>-<slug>`、`include: true`；source task provenance 只能写进 `spec_section_md` 正文块，例如 `> 派生自:task <source_task_id>(<source_task_key>)`，不得新增 breakdown draft 字段或 dev_task frontmatter 字段。

breakdown draft 的 `spec_section_md` 应贴合开发任务模板核心章节写作，至少覆盖任务概述、任务分解、验收标准相关信息；物化器会在不改变 draft schema 的前提下，把 `spec_section_md` 包进 dev_task 模板骨架。

`derive_followup` 的完整物化顺序必须全程使用 CAS hash：`deriveFollowupBreakdownDraft()` 返回 approved draft hash 后，先调用 `transitionBreakdownDraftStatus({ fromStatus: "approved", toStatus: "consumed", expectedHash: approvedHash })`，再调用 `materializeRequirement({ expectedDraftHash: approvedHash })`。`materializeRequirement` 会跳过已存在的旧 dev_task，只为新 follow-up 子任务写 `docs/03` 文档。严禁在 anchor 内用 `fs.writeFile` 直接改 draft JSON 或 dev_task markdown。

除 `derive_followup` 会先读当前 draft hash 外，其它显式 draft mutation 的 `expected_hash` 缺失时必须停止并要求调用方重读当前 draft hash。`ConflictError` 表示用户看到的 draft 已过期；`ValidationError` 表示 draft 内容或状态机非法；`LockTimeoutError` 表示另一个 anchor 正在写，稍后重试或升级用户。严禁在 anchor 内用 `fs.writeFile` 直接改 `docs/.ccb/drafts/breakdown/*.json`。

### ask target 路由契约

当本 skill 在协商或派工流程内需要发起 `ccb ask` 时，提交前必须通过 routing helper 锚定自身并解析目标。不要自行用项目级默认值、`main_*`、`ccb_codex` 或名称前缀猜目标。

调用前 import：

```js
import {
  buildCcbAskInvocation,
  resolveAskRouting
} from "../../lib/ask-routing/index.mjs";
```

提交前流程：

1. 若用户或 payload 已给出实际 agent 名，作为 `explicitTarget` 传入；`owner=ccb_codex` 只表示执行角色，不等于 ask target。
2. 若没有显式 target，调用 `resolveAskRouting({ projectRoot })`；helper 会用当前 CCB actor 与 `.ccb/ccb.config [windows]` 解析同组互补对端。
3. 返回 `status="needs_explicit_target"` 时必须停止并要求显式 target，不得猜测。
4. 返回 `status="ok"` 后，用 `routing.target` 作为 `ccb ask` 目标；可用 `buildCcbAskInvocation({ target: routing.target, taskId, callback })` 生成命令参数。
5. `routing.warnings` 非空或 `routing.crossGroup.requiresReason=true` 时，必须在提交前让跨组理由显式化，或在用户可见输出中记录 warning；合法跨组不硬拦。

## 4. Plugin 独立运行约定

本 skill 不调用 Console 业务写入接口。定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`；业务文档落点必须经 docs-structure resolver / 目录契约定位。人读 docs 文档是业务真相，`.ccb` 只承载协调和索引投影：

1. Requirement 文档：经 resolver 定位 `requirement`，当前契约落点为 `docs/02_需求设计/`。
2. 技术设计 / 开发任务文档：经 resolver 定位 `technical_design` / `dev_task`，当前契约落点为 `docs/03_开发计划/`。
3. 拆分草案：`docs/.ccb/drafts/breakdown/<requirementId>.json`。
4. 状态：Requirement / dev_task / ADR frontmatter。
5. 反思 / 协商 / 授权 / 审计记录：`docs/.ccb/events/journal.jsonl`。
6. 可复用经验沉淀：`docs/05_经验沉淀/`。

如果 Console 存在，它只监听文件并投影展示。没有 Console 时，用户仍可通过文件系统、grep 和编辑器审计完整工作。

## 5. 强协商与 sc 要求

v1.x 阶段进入任何业务节点都必须至少完成：

1. 1 轮 Codex 或其他 agent 协商。
2. 1 段 4 锚点反思。
3. 命中的必问项扫描。
4. 节点推荐 sc 指令的使用记录，或不可用时的替代说明。

当一轮协商没有新增信息时，不为讨论而讨论；升级用户或进入下一步。

## 6. 用户可见输出

每次运行结束时输出：

1. 当前进入的节点。
2. 已完成的关键判断。
3. 已处理和仍命中的必问项。
4. Codex 协商摘要和你的反思摘要。
5. 写入的文件路径。
6. 下一步是自动继续、因命中拍板项未获答复而停在终端等待答案，还是节点已完成后自然停下等待下一意图。
