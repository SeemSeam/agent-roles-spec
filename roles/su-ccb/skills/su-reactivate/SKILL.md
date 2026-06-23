---
name: su-reactivate
description: 重新激活 cancelled/deferred 主体的大状态指令入口。
metadata:
  short-description: CCB 重新激活入口
---

# /ccb:su-reactivate

## 1. 指令意图说明

`/ccb:su-reactivate` 用于让已取消或暂缓的 Requirement / 子任务重新进入可推进状态。它必须保留历史取消/暂缓原因，不得抹掉审计。

## 2. 节点集声明

重新激活后应根据上下文回到合适节点：

| 情况 | 建议节点 |
|---|---|
| 需求可能已过期 | `references/kernel/nodes/requirement_analysis.node.md` |
| 技术方案可能失效 | `references/kernel/nodes/technical_design.node.md` |
| 拆分草案需调整 | `references/kernel/nodes/task_breakdown.node.md` |
| 子任务可直接继续 | `references/kernel/nodes/dispatch.node.md` 或 `implementation.node.md` |

## 3. 触发约定

```text
/ccb:su-reactivate requirement_id=<id>
/ccb:su-reactivate task_id=<id> reason="重新纳入本轮交付"
```

## 4. Plugin 独立运行约定

定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。Requirement / dev_task 等业务文档落点必须经 docs-structure resolver / 目录契约定位；`.ccb` 只承载 state、events、draft、report、lock、index cache 等机器协调件。

reactivate 记录写入 state 和 EventJournal，不调用 Console 业务写入接口。Console 只展示重新激活结果。

## 5. 强协商与 sc 要求

重新激活必须找 Codex 协商“旧结论是否仍有效”。如果需求、技术环境或业务优先级变化，应先回到需求分析或技术设计。

## 6. 用户可见输出

输出重新激活对象、历史原因、仍有效的内容、需要重新分析的内容和下一节点。
