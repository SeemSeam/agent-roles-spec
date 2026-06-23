# 上下文恢复流程

> [v0.3.2-deprecated-reference]
> 本文档自 v0.3.2 起由 `su-resume/SKILL.md` 的 node-state 恢复规则和 `references/kernel/state-schema.yaml` 取代。
> 保留本文只为旧恢复流程对照；不主动写 deprecated `phase`。

## dev_task frontmatter 摘要

```md
---
doc_type: dev_task
task_id: <task-id>
status: reviewing / done / cancelled
current_node: implementation / review / archive
node_substate: <node-local-substate>
---
```

## 恢复逻辑
1. 扫描经 resolver 定位的 dev_task 文档目录。
2. 找到所有 `status != done` 且未 cancelled 的 dev_task。
3. 读取 frontmatter + EventJournal + 关联 requirement。
4. 告知用户当前任务和建议动作。

## 判断原则
- 单一进行中任务：直接建议继续。
- 多个进行中任务：要求用户选定。
- 状态缺失或冲突：先修复状态，再继续流程。
