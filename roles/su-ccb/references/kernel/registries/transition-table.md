# CCB Kernel · transition-table.md

> **Canonical**: 4 of 6
> **Status**: active (v0.5.1 lifecycle status protocol)
> **Owner**: CCB protocol kernel
> **Authority**: 所有节点之间合法转移的唯一注册表。
>   节点 manifest 的 `transitions[]` 字段**只能 ref 本表中的 transition_id**，不允许在 manifest 内重新定义新 transition 或重写 guard 逻辑。
> **Related**:
> - `state-schema.yaml` — task.last_transition_id 取值范围
> - `guard-registry.md` — guard_refs 字段引用源
> - `node-manifest-schema.yaml` — manifest transitions 字段约束（refs-only）
> - `nodes/*.node.yaml` — 各节点引用本表 transition_id

---

## 0. 本表的角色（多真相源防御）

v0.3.1 §12.1 警告："多真相源漂移"是节点化最大落地风险。
本表是**所有 transition 的唯一定义处**：

- ❌ **禁止** 在节点 manifest 内 inline 完整 transition 定义（含 trigger / when / guard 逻辑）
- ❌ **禁止** 在 SKILL.md 散文里描述"X 阶段后到 Y 阶段"作为规则
- ❌ **禁止** 在 hook / 调度器代码内硬编码 transition 路径
- ✅ **唯一允许**：节点 manifest 写 `{ transition_id, target_node }`，节点引擎按 transition_id 在本表查完整规则

**manifest lint 工具**（v0.3.2 checklist 第 6 项）会强制：每个 manifest 的 `transitions[*].transition_id` 必须存在于本表。

---

## 1. Transition ID 命名规则

格式：`<source_node>__<short_label>__to__<target_node>`

- **source_node**: 7 个 canonical 节点 ID 之一（参见 v0.3.2 §3）
- **short_label**: 描述触发场景，snake_case
- **target_node**: 目标节点 ID

例：
- `requirement_analysis__on_done__to__technical_design`
- `review__pass__to__archive`
- `review__replan_to_design__to__technical_design`

**特殊命名**：
- 进入 7 节点流程的第一个 transition 命名为 `__entry__to__requirement_analysis`（source = 空）
- 终态退出命名为 `archive__on_complete__to__terminal`（target = 终态符号）

---

## 2. Transition 注册表

> 字段说明：
> - **transition_id**: 唯一 ID
> - **source_node**: 来源节点（`__entry__` 表示外部入口；`__any__` 表示任意节点适用）
> - **target_node**: 目标节点（`__terminal__` 表示终态退出）
> - **trigger**: 触发器类型 — `on_done` / `on_subflow_done` / `on_guard_failure` / `on_escalation` / `on_external_event`
> - **when**: 触发条件表达式（task_state 字段为变量）
> - **guard_refs**: 必须满足的 guard ID 列表（来自 guard-registry.md）
> - **state_effects**: transition 执行后写入的 state 字段
> - **rollback_safe**: 该 transition 是否可被 replan 回滚
>
> v0.5.1 起 `task.status` 仅表示生命周期：`reviewing | done | cancelled`。
> 节点位置写 `task.current_node`，等待/异常写 `task.runtime_state`、
> `task.node_substate` 与 `batch_state.active_waiting_set`。

---

### 2.1 入口 Transitions

#### `__entry__to__requirement_analysis`
- **source_node**: `__entry__`
- **target_node**: `requirement_analysis`
- **trigger**: `on_external_event`
- **when**: `event_type == 'task_created'` OR 用户调用 `/ccb:su-plan`
- **guard_refs**: []
- **idempotency**:
  - 基于事件 `event_id`（参见 state-schema.yaml `batch_state.consumed_events` dedupe 规则）
  - 消费前检查 `event_id NOT IN batch_state.consumed_events[].event_id`；重复则丢弃
  - 消费成功后追加 `{event_id, idempotency_key, event_type, consumed_at, consumer_transition_id}`
- **state_effects**:
  - `task.current_node = 'requirement_analysis'`
  - `task.node_substate = 'proposed'`
  - `task.runtime_state = 'running'`
  - `task.status = 'reviewing'`
  - `batch_state.consumed_events` append
- **rollback_safe**: 否（入口）

---

### 2.2 requirement_analysis 出口 Transitions

#### `requirement_analysis__on_done__to__technical_design`
- **source_node**: `requirement_analysis`
- **target_node**: `technical_design`
- **trigger**: `on_done`
- **when**: 节点 exit_conditions 全部满足（详见 requirement_analysis.node.yaml）
- **guard_refs**:
  - `inv_no_pending_user_decision_in_autonomous`（v0.3.3 起 enforce）
- **state_effects**:
  - `task.current_node = 'technical_design'`
  - `task.node_substate = null`
  - `task.runtime_state = 'running'`
  - `task.status = 'reviewing'`
  - `task.last_transition_id = 'requirement_analysis__on_done__to__technical_design'`
- **rollback_safe**: 是

#### `requirement_analysis__escalate__to__terminal`
- **source_node**: `requirement_analysis`
- **target_node**: `__terminal__`（escalated state，等待用户仲裁）
- **trigger**: `on_escalation`
- **when**: `task.runtime_state == 'escalated'`
- **guard_refs**:
  - `post_escalation_recorded`
- **state_effects**:
  - `task.runtime_state = 'escalated'`
  - `batch_state.active_waiting_set` append `{task_id, waiting_for: user_arbitration, since: iso-8601, resume_trigger: manual_or_escalation_resume}`
- **rollback_safe**: 否（人工介入）

---

### 2.3 technical_design 出口 Transitions

#### `technical_design__on_done__to__task_breakdown`
- **source_node**: `technical_design`
- **target_node**: `task_breakdown`
- **trigger**: `on_done`
- **when**: 节点 exit_conditions 满足
- **guard_refs**:
  - `inv_no_pending_user_decision_in_autonomous`
- **state_effects**:
  - `task.current_node = 'task_breakdown'`
  - `task.node_substate = null`
  - `task.last_transition_id = 'technical_design__on_done__to__task_breakdown'`
- **rollback_safe**: 是

#### `technical_design__escalate__to__terminal`
- **source_node**: `technical_design`
- **target_node**: `__terminal__`
- **trigger**: `on_escalation`
- **when**: `task.runtime_state == 'escalated'`
- **guard_refs**: [post_escalation_recorded]
- **state_effects**: 同 requirement_analysis__escalate__to__terminal
- **rollback_safe**: 否

---

### 2.4 task_breakdown 出口 Transitions

#### `task_breakdown__on_done__to__dispatch`
- **source_node**: `task_breakdown`
- **target_node**: `dispatch`
- **trigger**: `on_done`
- **when**: 节点 exit_conditions 满足
- **guard_refs**:
  - `inv_classification_required_before_dispatch`
- **state_effects**:
  - `task.current_node = 'dispatch'`
  - `task.node_substate = 'awaiting_codex_pickup'`
  - `task.runtime_state = 'waiting_codex'`
  - `task.status = 'reviewing'`
  - `task.last_transition_id = 'task_breakdown__on_done__to__dispatch'`
- **rollback_safe**: 是

#### `task_breakdown__escalate__to__terminal`
- 同 §2.3 的 escalate 模式

---

### 2.5 dispatch 出口 Transitions

#### `dispatch__on_codex_pickup__to__implementation`
- **source_node**: `dispatch`
- **target_node**: `implementation`
- **trigger**: `on_external_event`
- **when**: `event_type == 'codex_picked_up'` AND `task.spec_hash 已被 codex 接收`
- **guard_refs**:
  - `pre_dispatch_red_flags_clear`
  - `pre_dispatch_spec_hash_match`
  - `pre_dispatch_current_node_ready`
  - `inv_dispatch_only_from_dispatch_node`
- **idempotency**:
  - 基于事件 `event_id`（参见 state-schema.yaml `batch_state.consumed_events` dedupe 规则）
  - 消费前检查 `event_id NOT IN batch_state.consumed_events[].event_id`；重复则丢弃
  - 消费成功后追加 `batch_state.consumed_events` 一条
  - **注**：`pre_dispatch_idempotency` guard 属于 `dispatch_to_codex` primitive，不在本 transition 使用；transition-level 幂等只看事件去重
- **state_effects**:
  - `task.current_node = 'implementation'`
  - `task.node_substate = 'executing'`
  - `task.runtime_state = 'waiting_codex'`
  - `task.status = 'reviewing'`
  - `task.last_transition_id = 'dispatch__on_codex_pickup__to__implementation'`
  - `batch_state.consumed_events` append
- **rollback_safe**: 否（已经派工，需走 replan）

#### `dispatch__codex_unavailable__to__terminal`
- **source_node**: `dispatch`
- **target_node**: `__terminal__`
- **trigger**: `on_guard_failure`
- **when**: `pre_codex_mounted` 失败超过重试次数
- **guard_refs**: []
- **state_effects**:
  - `task.runtime_state = 'blocked'`
  - `task.blocker_type = 'codex_unavailable'`
- **rollback_safe**: 否

#### `dispatch__codex_rejected__to__terminal`
- **source_node**: `dispatch`
- **target_node**: `__terminal__`
- **trigger**: `on_external_event`
- **when**: `event_type == 'codex_rejected'`（codex 已挂载但拒接派工，譬如 spec 不可读、bounceback 触发、并发限制等）
- **guard_refs**: []
- **semantic_equivalence**:
  - 语义等价于 `escalate_to_human + mark_waiting(waiting_for=user_arbitration)` 原语链
  - 差异：本 transition 由外部事件驱动，不经 primitive executor，所以 post_escalation_recorded guard 不直接生效
  - transition-level 校验保证所有等价 state_effects 被落地（见下）
- **idempotency**:
  - 基于事件 `event_id`（参见 state-schema.yaml `batch_state.consumed_events` dedupe 规则）
  - 消费前检查 `event_id NOT IN batch_state.consumed_events[].event_id`；重复则丢弃
  - 消费成功后追加 `batch_state.consumed_events` 一条
- **state_effects**:
  - `task.runtime_state = 'escalated'`
  - `task.blocker_type = 'codex_rejected'`
  - `batch_state.escalations` append 完整 canonical 形态：
    ```yaml
    - escalation_id: uuid
      reason_class: codex_rejected_dispatch
      raised_at: iso-8601
      task_id: <current task>
      event_id: <event.event_id>
      payload:
        codex_reject_reason: <event.payload.reason>
        spec_path: <task.spec_path>
    ```
  - `batch_state.active_waiting_set` append `{task_id, waiting_for: user_arbitration, since: iso-8601, resume_trigger: manual_or_escalation_resume}`
  - `batch_state.current_task_id` suspend（若当前 id == task_id 则清空或转给下一个 active task）
  - `batch_state.revision += 1`（CAS checkpoint，等同 escalate_to_human primitive 的 checkpoint 规则）
  - `batch_state.consumed_events` append `{event_id, idempotency_key?, event_type: 'codex_rejected', consumed_at, consumer_transition_id}`
- **rollback_safe**: 否
- **使用场景**: codex 主动 raise blocker（早于 implementation 节点）；或派工后立即返回 reject 信号

---

### 2.6 implementation 出口 Transitions

#### `implementation__on_receipt_ready__to__review`
- **source_node**: `implementation`
- **target_node**: `review`
- **trigger**: `on_external_event`
- **when**: `event_type == 'codex_receipt_ready'` AND receipt 已落盘
- **guard_refs**: []
- **idempotency**:
  - 基于事件 `event_id`（参见 state-schema.yaml `batch_state.consumed_events` dedupe 规则）
  - 消费前检查 `event_id NOT IN batch_state.consumed_events[].event_id`；重复则丢弃
  - 消费成功后追加 `batch_state.consumed_events` 一条
- **state_effects**:
  - `task.current_node = 'review'`
  - `task.node_substate = 'auto_reviewing'`
  - `task.runtime_state = 'running'`
  - `task.status = 'reviewing'`
  - `task.last_transition_id = 'implementation__on_receipt_ready__to__review'`
  - `batch_state.consumed_events` append
- **rollback_safe**: 是（review 失败可走 replan）

#### `implementation__codex_blocked__to__terminal`
- **source_node**: `implementation`
- **target_node**: `__terminal__`
- **trigger**: `on_external_event`
- **when**: codex 主动 raise blocker（譬如 unsolicited_findings 中含 non-overridable，或 implementation 过程中遇到 non-overridable 决策）
- **guard_refs**: []
- **semantic_equivalence**:
  - 语义等价于 `escalate_to_human + mark_waiting(waiting_for=user_arbitration)` 原语链
  - 差异：由外部事件驱动，不经 primitive executor，所以 post_escalation_recorded guard 不直接生效；由 transition-level 校验保证所有 state_effects 被落地
- **idempotency**:
  - 基于事件 `event_id`（参见 state-schema.yaml `batch_state.consumed_events` dedupe 规则）
  - 消费前检查 `event_id NOT IN batch_state.consumed_events[].event_id`；重复则丢弃
  - 消费成功后追加 `batch_state.consumed_events` 一条
- **state_effects**:
  - `task.runtime_state = 'escalated'`
  - `task.blocker_type = 'claude_decision_required'` (若 blocker 源于 non-overridable decision) 或 `codex_unavailable` (若 codex 实际不可用)
  - `batch_state.escalations` append 完整 canonical 形态：
    ```yaml
    - escalation_id: uuid
      reason_class: codex_blocked_during_implementation
      raised_at: iso-8601
      task_id: <current task>
      event_id: <event.event_id>
      payload:
        codex_block_reason: <event.payload.reason>
        unsolicited_findings: <event.payload.findings>
    ```
  - `batch_state.active_waiting_set` append `{task_id, waiting_for: user_arbitration, since: iso-8601, resume_trigger: manual_or_escalation_resume}`
  - `batch_state.current_task_id` suspend（若当前 id == task_id 则清空或转给下一个 active task）
  - `batch_state.revision += 1`（CAS checkpoint）
  - `batch_state.consumed_events` append
- **rollback_safe**: 否

---

### 2.7 review 出口 Transitions

#### `review__pass__to__archive`
- **source_node**: `review`
- **target_node**: `archive`
- **trigger**: `on_done`
- **when**: `task.review_status == 'passed'`
- **guard_refs**:
  - `inv_review_before_archive`
  - `post_review_status_set`
- **state_effects**:
  - `task.current_node = 'archive'`
  - `task.node_substate = null`
  - `task.last_transition_id = 'review__pass__to__archive'`
- **rollback_safe**: 否（终态前最后一步）

#### `review__replan_to_implementation__to__implementation`
- **source_node**: `review`
- **target_node**: `implementation`
- **trigger**: `on_subflow_done`
- **when**: `subflows.replan_from_review.outputs.reentry_node == 'implementation'`
- **guard_refs**: []
- **state_effects**:
  - `task.current_node = 'implementation'`
  - `task.node_substate = 'replanning'`
  - `task.rollback_origin = { from_node: 'review', from_transition_id: 'review__replan_to_implementation__to__implementation', triggered_at: now() }`
  - `task.last_transition_id = 'review__replan_to_implementation__to__implementation'`
  - `task.status = 'reviewing'`
- **rollback_safe**: 是（可二次 replan）

#### `review__replan_to_task_breakdown__to__task_breakdown`
- **source_node**: `review`
- **target_node**: `task_breakdown`
- **trigger**: `on_subflow_done`
- **when**: `subflows.replan_from_review.outputs.reentry_node == 'task_breakdown'`
- **guard_refs**: []
- **state_effects**:
  - `task.current_node = 'task_breakdown'`
  - `task.node_substate = 'replanning'`
  - `task.rollback_origin = { from_node: 'review', from_transition_id: 'review__replan_to_task_breakdown__to__task_breakdown', triggered_at: now() }`
  - `task.last_transition_id = 'review__replan_to_task_breakdown__to__task_breakdown'`
  - `task.status = 'reviewing'`
- **rollback_safe**: 是

#### `review__replan_to_technical_design__to__technical_design`
- **source_node**: `review`
- **target_node**: `technical_design`
- **trigger**: `on_subflow_done`
- **when**: `subflows.replan_from_review.outputs.reentry_node == 'technical_design'`
- **guard_refs**: []
- **state_effects**:
  - `task.current_node = 'technical_design'`
  - `task.node_substate = 'replanning'`
  - `task.rollback_origin = { from_node: 'review', from_transition_id: 'review__replan_to_technical_design__to__technical_design', triggered_at: now() }`
  - `task.last_transition_id = 'review__replan_to_technical_design__to__technical_design'`
  - `task.status = 'reviewing'`
- **rollback_safe**: 是

#### `review__replan_to_requirement_analysis__to__requirement_analysis`
- **source_node**: `review`
- **target_node**: `requirement_analysis`
- **trigger**: `on_subflow_done`
- **when**: `subflows.replan_from_review.outputs.reentry_node == 'requirement_analysis'`
- **guard_refs**: []
- **state_effects**:
  - `task.current_node = 'requirement_analysis'`
  - `task.node_substate = 'replanning'`
  - `task.rollback_origin = { from_node: 'review', from_transition_id: 'review__replan_to_requirement_analysis__to__requirement_analysis', triggered_at: now() }`
  - `task.last_transition_id = 'review__replan_to_requirement_analysis__to__requirement_analysis'`
  - `task.status = 'reviewing'`
- **rollback_safe**: 是
- **使用场景**: review 发现需求理解错误（譬如方案对了但解决了错的问题）

#### `review__escalate__to__terminal`
- **source_node**: `review`
- **target_node**: `__terminal__`
- **trigger**: `on_escalation`
- **when**: `task.runtime_state == 'escalated'`（譬如 review 发现 non-overridable 设计冲突）
- **guard_refs**: [post_escalation_recorded]
- **state_effects**: 同其他 escalate
- **rollback_safe**: 否

---

### 2.8 archive 出口 Transitions

#### `archive__on_complete__to__terminal`
- **source_node**: `archive`
- **target_node**: `__terminal__`
- **trigger**: `on_done`
- **when**: 节点 exit_conditions 满足（spec 已移到 archive 目录、status = done）
- **guard_refs**:
  - `inv_completion_state_only_after_review_passed`
  - `pre_archive_review_passed`
  - `pre_archive_idempotency`
- **state_effects**:
  - `task.runtime_state = 'completed'`
  - `task.status = 'done'`
  - `task.last_transition_id = 'archive__on_complete__to__terminal'`
- **rollback_safe**: 否（终态）

---

### 2.9 跨节点 Transitions（适用于任意节点）

#### `__any__to__terminal_via_user_cancel`
- **source_node**: `__any__`
- **target_node**: `__terminal__`
- **trigger**: `on_external_event`
- **when**: `event_type == 'batch_cancelled'` OR 用户主动 stop
- **guard_refs**: []
- **idempotency**:
  - 基于事件 `event_id`（参见 state-schema.yaml `batch_state.consumed_events` dedupe 规则）
  - 消费前检查 `event_id NOT IN batch_state.consumed_events[].event_id`；重复则丢弃
  - 消费成功后追加 `batch_state.consumed_events` 一条
- **state_effects**:
  - `task.runtime_state = 'completed'`
  - `task.status = 'cancelled'`
  - `batch_state.consumed_events` append
- **rollback_safe**: 否

#### `__any__to__terminal_via_loop_budget_exhausted`
- **source_node**: `__any__`
- **target_node**: `__terminal__`
- **trigger**: `on_guard_failure`
- **when**: `batch_state.loop_budget` 耗尽（per_task 或 per_batch）
- **guard_refs**: [post_escalation_recorded]
- **state_effects**:
  - `task.runtime_state = 'escalated'`
  - `batch_state.escalations` append `reason_class: loop_budget_exhausted`
  - `batch_state.active_waiting_set` append `{task_id, waiting_for: user_arbitration, since: iso-8601, resume_trigger: manual_or_escalation_resume}`
- **rollback_safe**: 否

---

### 2.10 Epic lifecycle Transitions（v0.5.0，不属于 7 节点）

#### `epic__on_first_subtask_dispatched__planning_to_delivering`
- **source_lifecycle**: `epic`
- **source_status**: `planning`
- **target_status**: `delivering`
- **trigger**: `on_external_event`
- **when**: `event_type == 'subtask_dispatched'` AND `event.parent_epic_id == epic.id`
- **guard_refs**:
  - `inv_parent_existence_guard`
- **state_effects**:
  - `task.kind = 'epic'`
  - `task.epic_status = 'delivering'`
- **rollback_safe**: 是

#### `epic__on_all_subtasks_archived__delivering_to_delivered`
- **source_lifecycle**: `epic`
- **source_status**: `delivering`
- **target_status**: `delivered`
- **trigger**: `on_external_event`
- **when**: `event_type == 'subtask_archived'`
- **guard_refs**:
  - `inv_all_child_subtasks_archived`
- **state_effects**:
  - `task.epic_status = 'delivered'`
- **rollback_safe**: 否

#### `epic__on_subtask_review_fail__delivering_to_planning`
- **source_lifecycle**: `epic`
- **source_status**: `delivering`
- **target_status**: `planning`
- **trigger**: `on_external_event`
- **when**: `event_type == 'epic_replan_requested'`
- **guard_refs**:
  - `inv_source_subtask_belongs_to_target_epic`
- **handler**: `epic_lifecycle/handler__epic_replan`
- **state_effects**:
  - `task.epic_status = 'planning'`
  - emit `epic_replan_requested`
- **rollback_safe**: 是

#### `epic__on_user_cancel__planning_to_cancelled`
- **source_lifecycle**: `epic`
- **source_status**: `planning`
- **target_status**: `cancelled`
- **trigger**: `on_external_event`
- **when**: `event_type == 'user_cancel'`
- **guard_refs**: []
- **state_effects**:
  - `task.epic_status = 'cancelled'`
- **rollback_safe**: 否

#### `epic__on_user_cancel__delivering_to_cancelled`
- **source_lifecycle**: `epic`
- **source_status**: `delivering`
- **target_status**: `cancelled`
- **trigger**: `on_external_event`
- **when**: `event_type == 'user_cancel'`
- **guard_refs**: []
- **state_effects**:
  - `task.epic_status = 'cancelled'`
- **rollback_safe**: 否

### 2.11 Requirement lifecycle Transitions（v0.5.0，Requirement 表）

#### `req__on_analysis_done__drafting_to_planning`
- **source_lifecycle**: `requirement`
- **source_status**: `drafting`
- **target_status**: `planning`
- **trigger**: `on_external_event`
- **when**: `event_type == 'requirement_analysis_completed'`
- **guard_refs**: []
- **state_effects**:
  - `Requirement.status = 'planning'`
- **rollback_safe**: 是

#### `req__on_first_subtask_dispatched__planning_to_delivering`
- **source_lifecycle**: `requirement`
- **source_status**: `planning`
- **target_status**: `delivering`
- **trigger**: `on_external_event`
- **when**: `event_type == 'subtask_dispatched'`
- **guard_refs**:
  - `inv_parent_existence_guard`
- **state_effects**:
  - `Requirement.status = 'delivering'`
- **rollback_safe**: 是

#### `req__on_all_epics_delivered__delivering_to_delivered`
- **source_lifecycle**: `requirement`
- **source_status**: `delivering`
- **target_status**: `delivered`
- **trigger**: `on_external_event`
- **when**: `event_type == 'epic_delivered'`
- **guard_refs**:
  - `inv_all_child_epics_delivered`
- **state_effects**:
  - `Requirement.status = 'delivered'`
- **rollback_safe**: 否

#### `req__on_user_defer__any_to_deferred`
- **source_lifecycle**: `requirement`
- **source_status**: `__any__`
- **target_status**: `deferred`
- **trigger**: `on_external_event`
- **when**: `event_type == 'user_defer'`
- **guard_refs**: []
- **state_effects**:
  - `Requirement.status = 'deferred'`
- **rollback_safe**: 是

#### `req__on_user_cancel__any_to_cancelled`
- **source_lifecycle**: `requirement`
- **source_status**: `__any__`
- **target_status**: `cancelled`
- **trigger**: `on_external_event`
- **when**: `event_type == 'user_cancel'`
- **guard_refs**: []
- **state_effects**:
  - `Requirement.status = 'cancelled'`
- **rollback_safe**: 否

### 2.12 Audit events（emit-only，不改 7 节点状态）

#### `audit_event__subtask_planning_inherited`
- **source_lifecycle**: `task_breakdown`
- **target_status**: `emit_only`
- **trigger**: `on_external_event`
- **when**: `event_type == 'subtask_planning_inherited'`
- **guard_refs**:
  - `inv_kind_node_consistency_guard`
- **state_effects**:
  - append EventJournal payload `{ from_epic_id, spec_section_id, skipped_nodes }`
- **rollback_safe**: 否

---

## 3. Transition 调用矩阵

### 3.1 按 source_node 索引

| source_node | 出口 transitions |
|---|---|
| `__entry__` | __entry__to__requirement_analysis |
| requirement_analysis | requirement_analysis__on_done__to__technical_design, requirement_analysis__escalate__to__terminal |
| technical_design | technical_design__on_done__to__task_breakdown, technical_design__escalate__to__terminal |
| task_breakdown | task_breakdown__on_done__to__dispatch, task_breakdown__escalate__to__terminal |
| dispatch | dispatch__on_codex_pickup__to__implementation, dispatch__codex_unavailable__to__terminal, dispatch__codex_rejected__to__terminal |
| implementation | implementation__on_receipt_ready__to__review, implementation__codex_blocked__to__terminal |
| review | review__pass__to__archive, review__replan_to_implementation__to__implementation, review__replan_to_task_breakdown__to__task_breakdown, review__replan_to_technical_design__to__technical_design, review__replan_to_requirement_analysis__to__requirement_analysis, review__escalate__to__terminal |
| archive | archive__on_complete__to__terminal |
| `__any__` | __any__to__terminal_via_user_cancel, __any__to__terminal_via_loop_budget_exhausted |
| epic lifecycle | epic__on_first_subtask_dispatched__planning_to_delivering, epic__on_all_subtasks_archived__delivering_to_delivered, epic__on_subtask_review_fail__delivering_to_planning, epic__on_user_cancel__planning_to_cancelled, epic__on_user_cancel__delivering_to_cancelled |
| requirement lifecycle | req__on_analysis_done__drafting_to_planning, req__on_first_subtask_dispatched__planning_to_delivering, req__on_all_epics_delivered__delivering_to_delivered, req__on_user_defer__any_to_deferred, req__on_user_cancel__any_to_cancelled |
| audit | audit_event__subtask_planning_inherited |

### 3.2 按 trigger 类型索引

| trigger | transitions |
|---|---|
| on_done | requirement_analysis→technical_design, technical_design→task_breakdown, task_breakdown→dispatch, review→archive (pass), archive→terminal |
| on_subflow_done | review 4 个 replan 出口 |
| on_external_event | __entry__, dispatch→implementation, dispatch codex_rejected, implementation→review, implementation 阻塞 escalate, __any__ 用户取消 |
| on_escalation | requirement_analysis/technical_design/task_breakdown/review escalate, |
| on_guard_failure | dispatch codex_unavailable, __any__ loop budget exhausted |

---

## 4. 节点 manifest 引用规则

每个节点 manifest 在 `transitions[]` 字段只能写：

```yaml
transitions:
  - transition_id: requirement_analysis__on_done__to__technical_design
    target_node: technical_design  # 必须与本表一致（lint 校验）
  - transition_id: requirement_analysis__escalate__to__terminal
    target_node: __terminal__
```

**禁止在 manifest 内写**：
- `trigger:` 字段（已在本表定义）
- `when:` 字段（已在本表定义）
- `guard_refs:` 字段（transition 级别 guard 已在本表定义；节点级 guard 在 manifest 的 `guards.transition` 段，但仅作"补充"用，不能与本表冲突）
- `state_effects:` 字段（已在本表定义）

**lint 工具校验**：
- transition_id ∈ 本表
- target_node 与本表一致
- manifest 内不包含 trigger / when / state_effects 字段

---

## 5. 新增 transition 的流程

1. 在本表对应 `### 2.X` 章节追加新 transition（按命名规则给 ID）
2. 写明 source_node / target_node / trigger / when / guard_refs / state_effects / rollback_safe
3. 更新 §3 索引矩阵
4. 在节点 manifest 的 `transitions[]` 引用新 ID
5. manifest lint 跑一遍

**禁止**：
- 在 manifest 直接 inline 新 transition 而不在本表注册
- 在节点引擎代码硬编码 transition 路径
- 在 SKILL.md 描述新转移规则

---

## 6. v0.3.2 实现边界

### 6.1 必须实现

- 所有 §2 列出的 transitions（共 21 条）
- transition_id 注册表（YAML 序列化版本，供 lint 工具使用）
- manifest lint 工具校验 refs-only

### 6.2 v0.3.2 可简化

- `__any__` 类型 transitions：v0.3.2 阶段不强制运行时检查（仅 lint warning），v0.3.3 起 enforce
- `on_external_event` 类型：v0.3.2 由 hook 脚本写 task_state，下次 load_work_state 触发判定；v0.4 由 reactive scheduler 直接消费

### 6.3 不做

- transition 的 webhook 触发：v0.4+ 由 reactive scheduler 实现
- 跨 batch 的 transition：v0.5+

---

## 7. v0.4 演进预告

v0.4 终态可能调整：

- `on_done` / `on_subflow_done` / `on_external_event` 统一为 `event_type` 字段
- `__any__` 转为 reactive scheduler 的全局监听
- transition 增加 `provenance_required` 字段（哪些 transition 必须有 evidence）

**v0.3.2 必须遵守**：本表的 21 条 transition_id 在 v0.4 不会重命名，只可能新增字段。

---

## 8. 引用与依赖

- **依赖于**: state-schema.yaml（state 字段）、guard-registry.md（guard_refs 来源）
- **被依赖于**: node-manifest-schema.yaml（transitions 字段约束）、所有 nodes/*.node.yaml（必须 ref 本表）

---

*本表是 CCB 节点 transition 的唯一注册表。manifest / 调度器 / hook 都只能 ref，不能定义。违反者会被 manifest lint 阻断。*
