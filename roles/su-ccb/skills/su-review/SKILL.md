---
name: su-review
description: 审查执行回执、diff 和验证证据，决定通过、返工、replan 或升级用户。
metadata:
  short-description: CCB 审查入口
---

# /ccb:su-review

## 1. 指令意图说明

`/ccb:su-review` 用于判断执行结果是否真的满足 spec。它不是“看一眼测试通过”，而是把执行回执、实际 diff、验收项和风险放在一起审查。

## 2. 节点集声明

主要进入：

| 节点 | Manifest |
|---|---|
| 审查 | `references/kernel/nodes/review.node.md` |

可能回退：

| Review 发现的问题 | 回退节点 |
|---|---|
| 需求理解错误 | `references/kernel/nodes/requirement_analysis.node.md` |
| 技术路线错误 | `references/kernel/nodes/technical_design.node.md` |
| 切片错误 | `references/kernel/nodes/task_breakdown.node.md` |
| 实现缺陷 | `references/kernel/nodes/implementation.node.md` |

## 3. 触发约定

```text
/ccb:su-review task_id=<subtaskId>
/ccb:su-review receipt=<path-to-receipt>
/ccb:su-review review 当前回执
```

如果当前上下文已包含 execution receipt，可直接进入 review；否则先要求用户或事件记录提供回执路径。

## 4. Plugin 独立运行约定

定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。开发任务、技术设计等业务文档落点必须经 docs-structure resolver / 目录契约定位。

本 skill 直接读取开发任务文档、回执、diff 摘要和 EventJournal 文件。不调用 Console 业务写入接口获取 proposal 或写审查状态。Console 可以展示 review 结果，但不成为审查真相源。

审查结论必须回写对应 `dev_task` 文档 frontmatter：通过写 `review_status: passed`，失败写 `review_status: failed`。写入使用 `lib/review-status/index.mjs` 的 `writeDevTaskReviewStatus({ projectRoot, taskId, reviewStatus })`，该 helper 会经 resolver 定位 `docs/03_开发计划/`、CAS 写文件、校验 `dev-task` schema 并写 EventJournal。

## 5. 强协商与 sc 要求

Review 必须：

1. 使用 review 节点推荐 sc 指令，或说明替代方式。
2. 找 Codex 协商审查结论。
3. 对每条验收给出 pass/fail/unknown。
4. 写 4 锚点反思。
5. 明确 decision：pass、request changes、replan 或 escalate。

## 6. 用户可见输出

输出审查结论、证据、未覆盖风险、是否需要返工、是否命中用户必问项，以及下一步节点。
