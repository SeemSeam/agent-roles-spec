# CCB Task Hierarchy Model (v0.5.0 · 历史)

> ⚠️ **已退役**：本三层模型（Requirement→Epic→SubTask）由 ADR-0028 两层模型（Requirement→SubTask）取代，v1.0 主线不再使用 Epic 层。本文档仅保留为 v0.5.0 协议快照的历史参考；当前 kernel 已完成实体级 Epic 协议退役。
>
> Reference for ADR-0013. Main-repo ADR: `docs/.ccb/decisions/ADR-0013-task-hierarchy-three-tier-model.md`.

## Model

```text
Requirement
  └─ Epic (Task.kind = epic)
       └─ SubTask (Task.kind = subtask)
```

- Requirement is an independent table/entity. It is not a Task.kind.
- Epic is a planning container stored in Task with `kind=epic`.
- SubTask is the only kind that enters the 7-node workflow.
- Direct PR mode is allowed: a Requirement can create a SubTask with `parent_epic_id=null`.

## Invariants

- `kind=epic` has `current_node=null`, `requirement_id` set, `parent_epic_id=null`, and `epic_status` in `planning|delivering|delivered|cancelled`.
- `kind=subtask` has `current_node` in the 7-node set or completed, `requirement_id` set, and `epic_status=null`.
- If a SubTask has `parent_epic_id`, the parent must be `kind=epic`, in the same project, and share the same `requirement_id`.
- `applicable_kinds(current_node) MUST contain kind`.

## Lifecycle

- Seven canonical nodes declare `applicable_kinds: [subtask]`.
- Epic lifecycle lives in `references/kernel/lifecycles/epic_lifecycle.yaml`.
- Requirement lifecycle lives in `references/kernel/lifecycles/requirement_lifecycle.yaml`.
- `epic_replan_requested` runs `handler__epic_replan`, which calls `epic.subtask_create` with idempotency key `event.failed_review_intent_id`.

## SubTask Planning Inheritance

In epic mode, `task_breakdown` creates an Epic and then creates a batch of SubTasks from `epic.spec.subtask_sections`. Each SubTask:

- starts at `current_node=dispatch`;
- inherits `requirement_id` and `linked_spec_id`;
- stores `spec_section_id`;
- stores `implementation_owner` (`claude` or `ccb_codex`);
- emits `subtask_planning_inherited` for audit.

## Templates

> ADR-0028（两层实体模型）退役本三层模型后，`requirement-template.md` / `epic-spec-template.md` / `epic-state-template.md` 三个顶层实体模板已移除；Requirement 与 dev_task 的真相模板改由 `templates/docs/02_需求设计/_模板_需求.md` 和下方 dev_task 模板承载。

- `templates/docs/03_开发计划/_模板_开发任务.md`
