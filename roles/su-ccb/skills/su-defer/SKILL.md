---
name: su-defer
description: 暂缓 Requirement 或子任务的大状态指令入口。
metadata:
  short-description: CCB 暂缓入口
---

# /ccb:su-defer

## 1. 指令意图说明

`/ccb:su-defer` 用于把某个 Requirement 或子任务暂时搁置，同时保留已有分析、设计、draft、执行和审计证据。

## 2. 节点集声明

defer 不属于单个节点，但会暂停当前节点推进。恢复时通过 `/ccb:su-resume` 判断应回到哪个节点 manifest。

| 当前状态 | 可能恢复节点 |
|---|---|
| 分析中 | `references/kernel/nodes/requirement_analysis.node.md` |
| 设计中 | `references/kernel/nodes/technical_design.node.md` |
| 拆分中 | `references/kernel/nodes/task_breakdown.node.md` |
| 执行中 | `references/kernel/nodes/implementation.node.md` |
| 审查中 | `references/kernel/nodes/review.node.md` |

## 3. 触发约定

```text
/ccb:su-defer requirement_id=<id> reason="优先级降低"
/ccb:su-defer task_id=<id>
```

## 4. Plugin 独立运行约定

定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。Requirement / dev_task 等业务文档落点必须经 docs-structure resolver / 目录契约定位；`.ccb` 只承载 events、draft、lock、index cache、schema/config 等机器协调件。

Requirement 暂缓写入需求文档 frontmatter；dev_task 暂缓写入对应 dev_task frontmatter；审计写 EventJournal。不得调用 Console 业务写入接口。

## 5. 强协商与 sc 要求

暂缓通常是用户决策；如暂缓会影响其他子任务、成本或交付承诺，应找 Codex 协商影响范围并向用户复述。

## 6. 用户可见输出

输出暂缓对象、原因、保留文件、恢复入口和受影响的关联任务。
