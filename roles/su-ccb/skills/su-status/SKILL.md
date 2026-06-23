---
name: su-status
description: 从 docs 人读真相源与 .ccb 协调件读取当前项目、Requirement 或子任务状态。
metadata:
  short-description: 状态查看入口
---

# /ccb:su-status

## 1. 指令意图说明

`/ccb:su-status` 用于回答“现在进行到哪里了、卡在哪里、下一步是什么”。它只读取 docs 人读真相源与 `.ccb` 协调件，不推进业务节点。

## 2. 节点集声明

本指令不直接进入业务节点，但需要理解 7 节点状态：

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
/ccb:su-status
/ccb:su-status requirement_id=<id>
/ccb:su-status task_id=<id>
```

### breakdown-draft read 契约

展示拆分草案状态时必须通过 lib 读取并得到 hash：

```js
import { readBreakdownDraft } from "../../lib/breakdown-draft/index.mjs";

const { draft, hash } = await readBreakdownDraft({ projectRoot, requirementId });
```

`ValidationError` 说明 draft 文件损坏或 schema drift，应报告给用户并建议 reconcile；`LockTimeoutError` 说明另一个 anchor 正在写，状态读取应提示稍后重试。`su-status` 是只读指令，严禁用 `fs.writeFile` 修正 `docs/.ccb/drafts/breakdown/*.json`。

## 4. Plugin 独立运行约定

启动/定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。业务文档落点必须经 docs-structure resolver / 目录契约定位。

读取：

1. Requirement / dev_task / ADR 等人读文档（经 resolver 定位；当前 dev_task 契约落点为 `docs/03_开发计划/`）
2. `docs/.ccb/events/journal.jsonl`
3. `docs/.ccb/drafts/breakdown/*.json`
4. `docs/00_文档地图.md` 与 `docs/.ccb/index/document-map.json`

不得调用 Console 业务写入接口获取状态。Console 展示只是 projection。

## 5. 协商与 sc 要求

状态查看本身不要求 Codex 协商。若用户要求你解释状态冲突、漂移或下一步建议，应进入对应业务节点或 reconcile 类指令，而不是在 status 里直接决策。

## 6. 用户可见输出

输出当前节点、最近事件、阻塞项、命中的用户必问项、下一步建议和相关文件路径。
