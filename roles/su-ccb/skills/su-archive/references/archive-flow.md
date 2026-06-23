# 归档流程

> [v0.3.2-compat-reference]
> 本清单保留为人工对照；archive 节点执行规则以 `references/kernel/nodes/archive.node.md` 为准。
> 归档 transition 只引用 `archive__on_complete__to__terminal`，不得从本文推导新规则。

## 标准步骤
1. 判断是否需要补文档。
2. 如需补文档，通过 `ccb ask [--task-id <id>] <agent>` 给 Codex 发精简文档任务；同步场景使用 `ccb ask --wait [--task-id <id>] <agent>`。
3. 更新 `docs/03_开发计划/*开发任务.md` frontmatter：
   - `status: done`
   - `current_node: archive`
   - `node_substate: archived`
   - `review_status: passed`
4. 写 EventJournal `archive_completed`。
5. 可选在 `docs/05_经验沉淀/` 记录复盘信息。

## 复盘建议字段
- 任务
- 复杂度
- 分支
- 开始时间
- 完成时间
- 耗时
- Token 消耗记录
- 经验教训

## 归档原则
- 复盘记录可选，不强制。
- 估算即可，不做精确统计。
- 用于后续流程优化，不作为硬性指标。

## Git 配合规则
- 设计确认后再从 `[开发基础分支]` 拉 `[功能分支前缀]/<模块>-<功能>` 分支。
- 审查通过后合并回 `[开发基础分支]`。
- `[开发基础分支] -> main` 由用户决定。
- 审查不通过继续在 feature 分支修正。
- 需要回滚时删除 feature 分支，不影响基础开发分支。
