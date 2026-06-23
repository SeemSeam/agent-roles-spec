---
name: su-materialize-requirement
description: 将用户已审查通过的 Requirement breakdown draft 物化为子任务。
metadata:
  short-description: Requirement 物化入口
---

# /ccb:su-materialize-requirement

## 1. 指令意图说明

`/ccb:su-materialize-requirement` 用于把已通过用户审查的拆分草案变成可派工的子任务。它表达用户确认“这些子任务可以进入交付”。

## 2. 节点集声明

主要衔接：

| 前置/后续 | 节点 |
|---|---|
| 前置 draft 来源 | `references/kernel/nodes/task_breakdown.node.md` |
| 后续派工 | `references/kernel/nodes/dispatch.node.md` |

如果 draft 未通过审查，应回到 task_breakdown 或 `/ccb:su-revise-breakdown`。

## 3. 触发约定

```text
/ccb:su-materialize-requirement --payload {"subject":"requirement","requirement_id":"<id>","expected_hash":"<draft_hash>"}
```

必须确认用户已 approve 当前 draft revision。没有 approval 时不得物化。

### materialize lib 调用契约

收到本指令后必须先执行拍板项扫描约定 v1，再调用 plugin lib。扫描对象是 `docs/.ccb/drafts/breakdown/<requirementId>.json` 的 `plan.spec_outline_md` + 全部 `include: true` 的 `subtasks[].spec_section_md`；命中未闭环即阻塞，回 task_breakdown 或 `/ccb:su-revise-breakdown`，不得调 lib 后再扫。

<!-- PAIBAN-SCAN-CONVENTION v1 START -->
放行前对「本节点在手文件」（各节点的"在手文件"定义见所在 manifest）执行【拍板项扫描约定 v1】：对在手文件运行 §钉死物件 2 的 rg pattern；命中处逐一人工裁决，归入三类之一才放行：① 已闭环拍板记录（含答案与理由）；② 非用户项（纯技术 / 中性词误命中）；③ 已显式移交下一节点的技术项。任一命中无法归类即阻塞，回对应节点在终端问到答案。机器辅助定位、人工裁决语义，不做语义硬判。
<!-- PAIBAN-SCAN-CONVENTION v1 END -->

扫描 pattern：

```text
待用户|待谁定|TBD|TODO|后续确认|待(确认|拍板|定|澄清|商榷|评估|回复|补充|明确|决)|未(定|决|确认|澄清|明确)|尚未(确定|明确|拍板|确认)|仍需(用户)?确认|需(用户)?(确认|拍板|澄清|回复|补充|明确|决策|授权)|等待用户(确认|拍板|裁决|仲裁|回复)
```

扫描放行后必须调用 plugin lib，不得自己 `fs.readFile` / `fs.writeFile` / `fs.rm` 绕过 runtime：

```js
import { materializeRequirement } from "../../lib/subtask/index.mjs";

const result = await materializeRequirement({
  projectRoot,
  requirementId,
  expectedDraftHash: expected_hash
});
```

`expected_hash` 必须来自用户审查的当前 breakdown draft。`ConflictError` 表示用户审查的 draft 已过期；`ValidationError` 表示 draft 或 dev_task 业务规则不满足；`LockTimeoutError` 表示另一个 anchor 正在物化同一需求。

`materializeRequirement` 负责：读 approved draft、经 docs-structure resolver 定位 `dev_task` 产物落点（当前契约为 `docs/03_开发计划/`）并生成 N 个开发任务文档、把 `spec_section_md` 包进开发任务模板核心章节（任务概述 / 任务分解 / 验收标准等）、写 EventJournal、全部 dev_task 文档成功后才把 draft 标记为 `consumed`。禁止在 SKILL.md 或节点内另写一套物化流程。

## 4. Plugin 独立运行约定

定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。直接读取 `docs/.ccb/drafts/breakdown/<requirementId>.json`，经 resolver 写入 dev_task 开发任务文档和 EventJournal。不得调用 Console 业务写入接口创建业务状态；Console 只通过 indexer 投影这些 dev_task 文档到 Task DB。

## 5. 强协商与 sc 要求

物化前必须找 Codex 协商 draft 是否仍可执行，重点检查 include、依赖、owner 和验收是否一致。命中业务规则或执行顺序争议时问用户。

## 6. 用户可见输出

输出创建的子任务列表、跳过项、依赖顺序、派工建议和写入路径。
