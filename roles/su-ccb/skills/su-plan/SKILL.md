---
name: su-plan
description: /ccb:su-flow 的 deprecated alias；保留到 v1.5 grace window。
metadata:
  short-description: su-flow 兼容入口
---

# /ccb:su-plan

## 1. 指令意图说明

`/ccb:su-plan` 是历史入口，语义等同于 `/ccb:su-flow` 的 planning 用法。v1.x 保留它是为了让旧项目和用户习惯不过早断裂。

新任务、新文档和新 UI 应优先使用 `/ccb:su-flow`。

## 2. 节点集声明

默认可进入 planning 三节点：

| 节点 | Manifest |
|---|---|
| 需求分析 | `references/kernel/nodes/requirement_analysis.node.md` |
| 技术设计 | `references/kernel/nodes/technical_design.node.md` |
| 任务拆分 | `references/kernel/nodes/task_breakdown.node.md` |

如果用户意图超出 planning，例如要求直接派工或审查，Claude 可以提示改用 `/ccb:su-flow`，也可以在充分说明后进入对应节点。

## 3. 触发约定

```text
/ccb:su-plan 帮我分析这个需求
/ccb:su-plan docs/02_需求设计/foo.md
```

等价转换：

```text
/ccb:su-flow <同一用户意图>
```

## 4. Plugin 独立运行约定

本 skill 不调用 Console 业务写入接口，不读取 Console 作为业务真相源。定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`；Requirement / technical_design / dev_task 等业务文档落点必须经 docs-structure resolver / 目录契约定位，拆分草案仍写 `docs/.ccb/drafts/breakdown/` 机制件。

## 5. Grace window

`su-plan` 保留到 v1.5。v1.5 之后是否删除由用户另行拍板。保留期间：

1. 不新增 `su-plan` 独有语义。
2. 不新增单独节点规则。
3. 所有行为跟随 `/ccb:su-flow`。
4. 文档中出现旧入口时，应标注 deprecated alias。
