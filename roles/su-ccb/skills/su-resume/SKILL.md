---
name: su-resume
description: 从 docs 人读真相源与 .ccb 协调件恢复 paused/deferred/in-progress 主体的上下文。
metadata:
  short-description: 恢复推进入口
---

# /ccb:su-resume

## 1. 指令意图说明

`/ccb:su-resume` 用于恢复上次中断、暂停或暂缓的工作。它先回答“我们停在哪里、为什么停、恢复后应该进入哪个节点”。

## 2. 节点集声明

恢复后可能进入任一节点：

| 节点 | Manifest |
|---|---|
| 需求分析 | `references/kernel/nodes/requirement_analysis.node.md` |
| 技术设计 | `references/kernel/nodes/technical_design.node.md` |
| 任务拆分 | `references/kernel/nodes/task_breakdown.node.md` |
| 派工 | `references/kernel/nodes/dispatch.node.md` |
| 实施 | `references/kernel/nodes/implementation.node.md` |
| 审查 | `references/kernel/nodes/review.node.md` |
| 归档 | `references/kernel/nodes/archive.node.md` |

## 3. 触发约定

```text
/ccb:su-resume
/ccb:su-resume requirement_id=<id>
/ccb:su-resume task_id=<id>
```

如果多个进行中主体冲突，先列出候选并让用户选择；不要自动猜。

### breakdown-draft read 契约

恢复停在 task_breakdown / review 门口的 Requirement 时，必须通过 lib 读取 draft：

```js
import { readBreakdownDraft } from "../../lib/breakdown-draft/index.mjs";

const { draft, hash } = await readBreakdownDraft({ projectRoot, requirementId });
```

恢复逻辑只能报告 draft 状态、hash、最近 review_history 和建议节点；不得在 resume 中直接改 draft。若需要修订，进入 `/ccb:su-revise-breakdown --payload {...}`；若需要批准，进入 `/ccb:su-approve --payload {"action":"breakdown_draft_approve",...}`。严禁用 `fs.writeFile` 直接修复 `docs/.ccb/drafts/breakdown/*.json`。

## 4. Plugin 独立运行约定

定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。直接读取经 resolver 定位的 Requirement / dev_task 等人读文档、EventJournal、draft 和文档地图；任务停点以 dev_task frontmatter 为准。不得调用 Console 业务写入接口恢复状态或消费 user intent。

## 5. 强协商与 sc 要求

恢复本身是管理动作；如果恢复后进入业务节点，该节点必须执行 v1.x always-on 协商和 sc 要求。若恢复状态冲突，需要找 Codex 协商判断真实停点，并写 4 锚点反思。

## 6. 用户可见输出

输出候选主体、当前节点、停止原因、最近事件、恢复建议、需要用户拍板的冲突项和下一步将进入的节点。
