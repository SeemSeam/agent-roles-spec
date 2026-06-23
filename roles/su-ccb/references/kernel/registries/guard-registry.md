# CCB Kernel · guard-registry.md

> **Canonical**: 3 of 6
> **Status**: active (v0.5.1 lifecycle status protocol)
> **Owner**: CCB protocol kernel
> **Authority**: 所有硬规则（pre-condition / post-condition / state transition invariant / PreToolUse hook）的唯一注册表。
>   原语 / 节点 manifest / hook 脚本只能 ref 本表中的 guard_id，**不允许散文里再定义新规则**。
> **Related**:
> - `state-schema.yaml` — guard 操作的字段
> - `primitive-executor-contract.md` — guard 在 stage 2 / stage 4 / transition 时被调用
> - `transition-table.md` — transition 引用 invariant_refs
> - `node-manifest-schema.yaml` — manifest guard_refs 字段只能 ref 本表 ID

---

## 0. 4 层 Guard 总览

| 层 | 触发时机 | 数量 | 命名前缀 |
|---|---|---|---|
| **L1: pre-condition** | 原语 stage 2（执行前） | 13 | `pre_*` |
| **L2: post-condition** | 原语 stage 4（执行后） | 7 | `post_*` |
| **L3: transition invariant** | 节点 transition 触发 / batch state mutation | 8 | `inv_*` |
| **L4: PreToolUse hook** | Claude Code 工具调用前（Bash/Edit/Write/AskUserQuestion 等） | 3 | `hook_*` |
| **L5: capability outcome guard** | `applyCapabilityOutcome` policy 执行前 | 3 | capability policy local id |

**总计 40 条 guard**。后续新增必须在本表注册并增加 ID，不允许在 SKILL.md / manifest / 散文里"隐式约束"。

### `requirement_cancel_terminal_protection`
- **触发 policy**: `requirement.cancel:cancelled:requirement`
- **检查条件**: 当前 Requirement 为 `delivered` 时拒绝；当前已为 `cancelled` 时 no-op；其它非终态允许继续。
- **失败行为**: 返回 `GUARD_FAILED`，不得覆盖已交付 Requirement。
- **来源**: 913778 取消闭环 pr2。

### `requirement_defer_terminal_protection`
- **触发 policy**: `requirement.defer:deferred:requirement`
- **检查条件**: 当前 Requirement 为 `delivered` 或 `cancelled` 时拒绝；当前已为 `deferred` 时 no-op；其它非终态允许继续。
- **失败行为**: 返回 `GUARD_FAILED`，不得用 defer 覆盖终态。
- **来源**: 913778 取消闭环 pr2。

### `subtask_cancel_terminal_protection`
- **触发 policy**: `subtask.cancel:cancelled:subtask`
- **检查条件**: 当前 dev_task 为 `done` 时拒绝；当前已为 `cancelled` 时 no-op；其它非终态允许继续。
- **失败行为**: 返回 `GUARD_FAILED`，done 子任务保持 done。
- **来源**: 913778 取消闭环 pr2。

---

## 1. L1: Pre-condition Guards（13 条）

### `pre_codex_mounted`
- **拦截原语**: consult_codex, explore_codex, dispatch_to_codex
- **检查条件**: v6 runtime preflight 通过（`ccb ping ccbd` + `ccb ping <agent>` 均返回 ok；agent 名来自 `.ccb/ccb.config`）
- **失败行为**: DENY + hint "请运行 v6 runtime preflight：`ccb --version` / `ccb ping ccbd` / `ccb ping <agent>`，定位失败步骤后修复"
- **绕过路径**: 无（必须先解决 v6 runtime / daemon / agent 任一层故障）
- **来源**: v0.3.1 §5.2.3（语义已对齐 v6；guard 名保留向后兼容 plugin SKILL.md 引用）

### `pre_write_spec_consult_required`
- **拦截原语**: write_spec
- **检查条件**: IF `task.decision_shape.multi_options == true` THEN `task.consult_records WHERE layer == design` 必须非空
- **失败行为**: DENY + hint "多方案设计必须先 consult_codex 获取独立评估"
- **绕过路径**: 调用 consult_codex (mode=consult, layer=design) 获取记录后重试
- **来源**: v0.3.1 §5.2.4 (Q2 修复)

### `pre_freeze_spec_provenance`
- **拦截原语**: freeze_spec
- **检查条件**: IF `task.scope_assessment.red_flags ∩ {contract_change, data_shape_change, state_flow_change, cross_module_dependency, irreversible_migration, security_impact} ≠ ∅` THEN `task.decision_refs` 必须包含至少 1 条 `consult_ref`、`human_decision_ref` 或 F7 `engineering_decidable_decisions[].decision_ref`。U1/U4/U6 必须 human decision；U2/U3/U5 仅在 5-of-5 通过时可用 consult-backed engineering decision。
- **失败行为**: DENY + hint "高影响红旗任务必须有决策证据：真实用户权威走 user 仲裁，工程可裁定触点走 consult + 5-of-5 evidence"
- **绕过路径**: 调用 consult_codex 或 ask_user_decision + record_decision_provenance；U2/U3/U5 可追加 engineering_decidable_decisions evidence ledger
- **来源**: v0.3.1 §5.2.4 (Q1/Q2 综合修复)

### `pre_dispatch_red_flags_clear`
- **拦截原语**: dispatch_to_codex
- **检查条件**: `∀ f ∈ task.open_red_flags: f.status != open`
- **失败行为**: DENY + hint "尚有未关闭红旗，请通过 resolve_red_flag 显式关闭"
- **绕过路径**: 对每个 open red_flag 调用 resolve_red_flag
- **来源**: v0.3.1 §5.2.5 + R4 洞 1 修复（v0.3.1 §10）

### `pre_dispatch_spec_hash_match`
- **拦截原语**: dispatch_to_codex
- **检查条件**: `task.spec_hash == sha256(file_content_at(task.spec_path))`
- **失败行为**: DENY + hint "spec 文件已被外部修改，请重新 freeze_spec"
- **绕过路径**: 重新 freeze_spec
- **来源**: v0.3.1 §5.2.5

### `pre_dispatch_current_node_ready`
- **拦截原语**: dispatch_to_codex
- **检查条件**: `task.current_node == dispatch` AND `task.status == reviewing`
- **失败行为**: DENY + hint "任务尚未进入 dispatch 节点，请先完成 task_breakdown transition"
- **绕过路径**: 完成 task_breakdown → dispatch transition
- **来源**: v0.3.1 §5.2.5

### `pre_dispatch_idempotency`
- **拦截原语**: dispatch_to_codex
- **检查条件**: `idempotency_key NOT IN batch_state.idempotency_log.dispatch`
- **失败行为**: DENY + hint "本任务在当前 revision 已派工过，请勿 hook replay"
- **绕过路径**: 推进 revision（任何合法 mutation）
- **来源**: v0.3.1 §5.2.5

### `pre_review_idempotency`
- **拦截原语**: review_codex_receipt
- **检查条件**: `idempotency_key NOT IN batch_state.idempotency_log.review`
- **失败行为**: DENY + hint "本任务在当前 revision 已审查过"
- **来源**: v0.3.1 §5.2.5 (R4 洞 3 修复)

### `pre_archive_review_passed`
- **拦截原语**: archive_spec
- **检查条件**: `task.review_status == passed`（本地冗余检查；主防线见 inv_completion_state_only_after_review_passed）
- **失败行为**: DENY + hint "归档前必须通过 review"
- **来源**: v0.3.1 §5.2.5

### `pre_archive_idempotency`
- **拦截原语**: archive_spec
- **检查条件**: `idempotency_key NOT IN batch_state.idempotency_log.archive`
- **失败行为**: DENY
- **来源**: v0.3.1 §5.2.5 (R4 洞 3 修复)

### `pre_ask_user_decision_not_autonomous`
- **拦截原语**: ask_user_decision
- **检查条件**: NOT (`batch_state.policy_profile == autonomous-batch` AND `batch_state.user_approval_mode == none`)
- **失败行为**: DENY + hint "自主模式禁止 ask_user_decision。U2/U3/U5 请优先走 engineering-decidable 5-of-5；U1/U4/U6 或证据失败再 escalate_to_human"
- **绕过路径**: 切换到 consult_codex 获取独立意见，记录 engineering_decidable evidence；或在真实用户权威场景 escalate_to_human
- **来源**: v0.3.1 §5.2.3 (Q1 修复)

### `pre_ask_user_approval_not_downgraded`
- **拦截原语**: ask_user_approval
- **检查条件**: IF `batch_state.policy_profile == autonomous-batch` AND `this_gate ∈ batch_state.downgraded_gates` THEN 自动跳过（视为 PASS，不写 record）
- **失败行为**: 不算失败，自动 SKIP（写 trace 标记）
- **来源**: v0.3.1 §5.2.3

### `pre_escalation_real_user_authority_required`
- **拦截原语**: escalate_to_human
- **检查条件**: `escalation_reason ∈ {U1_kernel_canonical_direction, U4_v04_schema_timing, U6_epic_archive_product_direction}` 直接 PASS；`escalation_reason ∈ {U2_db_api_rename, U3_task_status_derivation, U5_migration_backfill}` 时，必须证明 engineering-decidable 5-of-5 缺失或失败。若 5-of-5 已通过，不允许升级用户。
- **失败行为**: DENY + hint "该触点已满足 engineering-decidable 条件，请记录 consult-backed decision，不要打扰用户"
- **绕过路径**: 追加 task.engineering_decidable_decisions 并调用 record_decision_provenance；或提供 5-of-5 失败证据后重试 escalation
- **来源**: F7 + Y machine-enforced (v0.3.4)

### `pre_engineering_decision_evidence_complete`
- **拦截原语**: record_decision_provenance
- **检查条件**: IF `decided_by != user` AND `touchpoint ∈ {U2_db_api_rename, U3_task_status_derivation, U5_migration_backfill}` THEN `task.engineering_decidable_decisions[]` 新增项必须满足 5-of-5：evidence、reversibility、scoped、tested、canonical_consistency；且 `decision_ref` 指向 `batch_state.decision_records[].id`。
- **失败行为**: DENY + hint "engineering-decidable 决策缺少 5-of-5 evidence，不能写 provenance"
- **绕过路径**: 补齐 evidence block；或在 U1/U4/U6 真实用户权威场景走 gate.user_decision / escalate_to_human
- **来源**: F7 + Y machine-enforced (v0.3.4)

---

## 2. L2: Post-condition Guards（7 条）

### `post_consult_record_appended`
- **触发原语**: consult_codex
- **强制副作用**: `task.consult_records` 必须新增 1 条记录
- **失败行为**: 整个 stage 5 持久化回滚
- **来源**: v0.3.1 §6.2

### `post_consult_finding_disposition_recorded`
- **触发原语**: consult_codex
- **强制副作用**: 若 consult_record.unsolicited_findings 非空，或 consult 回执提出超出 Claude framing 的 root cause / unsolicited finding，则每个 `uf{n}` 必须在 `task.unsolicited_findings_log[]` 追加一条 disposition record。
- **disposition 取值**:
  - `open_red_flag`: finding 仍阻塞推进，必须创建或引用 `task.open_red_flags[]` 中 status=open 的 red_flag。
  - `resolved_by_consult`: finding 已被本轮或后续 consult 解决，必须写 rationale，并可引用 resolved red_flag / consult round。
  - `evidence_only`: finding 只作为证据或旁证保留，不改变 scope / roadmap / state。
  - `no_action`: finding 经判断不成立或不需要动作，必须写 rationale。
  - `demand_triggered_followup`: finding 不阻塞当前 slice，但触发后续 backlog / epic / hotfix，必须写 followup_ref 或明确 backlog 名称。
- **失败行为**: 回滚；不得静默丢弃 uf，也不得强制把所有 uf 都升级为 open red_flag。
- **来源**: C4 hotfix #6；v0.3.5-v0.3.8 field practice

### `post_decision_via_provenance`
- **触发原语**: consult_codex, ask_user_decision
- **强制副作用**: 若产生决策 → 必须调用 `record_decision_provenance` 写入 `batch_state.decision_records`，不允许直接 mutate `task.decision_records`。F7 U2/U3/U5 engineering-decidable 决策还必须 append `task.engineering_decidable_decisions[]`，并用 `decision_ref` 关联 batch canonical 决策。
- **失败行为**: 回滚
- **来源**: v0.3.1 §5.2.3 (R4 洞 4 修复，统一决策写路径)

### `post_freeze_spec_hash_set`
- **触发原语**: freeze_spec
- **强制副作用**: `task.spec_hash` 必须等于 `sha256(file_content)`；是否可进入 dispatch 由 `inv_classification_required_before_dispatch` 与 transition 判定
- **失败行为**: 回滚
- **来源**: v0.3.1 §5.2.4

### `post_review_status_set`
- **触发原语**: review_codex_receipt
- **强制副作用**: `task.review_status` 必须被设值（passed / needs_followup / design_conflict）；触发 batch checkpoint；从 batch_state.active_waiting_set 移除该 task
- **失败行为**: 回滚
- **来源**: v0.3.1 §5.2.5

### `post_resolve_red_flag_status`
- **触发原语**: resolve_red_flag
- **强制副作用**: 目标 red_flag 的 status 必须从 `open` 转到 `resolved_by_*` 之一，且必须填 `resolved_at` + `resolved_by`
- **失败行为**: 回滚
- **来源**: v0.3.1 §5.2.6 (R4 洞 1 修复)

### `post_escalation_recorded`
- **触发原语**: escalate_to_human
- **强制副作用**: `batch_state.escalations` 必须新增 1 条 `{escalation_id, reason_class, raised_at}`，且 `task.runtime_state = escalated`，且 task 以 `waiting_for=user_arbitration` 加入 `batch_state.active_waiting_set`
- **失败行为**: 回滚
- **来源**: v0.3.1 §5.2.6 + R4 修复（escalate_to_human 不走 AskUserQuestion 工具）

---

## 3. L3: State Transition Invariants（8 条）

> 这一层独立于工具 pre-condition，由 transition-table.md / 节点引擎在 transition 触发时校验。
> v0.3.1 §6.3 红线：是"时间规则"而不是"工具规则"。

### `inv_review_before_archive`
- **检查时机**: 任何 transition 目标节点 = `archive` 或 task.status 转 done
- **规则**: `task.status` 不能转 done 除非前置 `task.review_status == passed`
- **失败行为**: 回滚 transition + emit invariant_violation
- **来源**: v0.3.1 §6.3

### `inv_dispatch_only_from_dispatch_node`
- **检查时机**: dispatch_to_codex 或 transition 目标 current_node = implementation
- **规则**: 必须从 `current_node=dispatch` 且 `status=reviewing` 转移
- **来源**: v0.3.1 §6.3

### `inv_classification_required_before_dispatch`
- **检查时机**: transition 目标 current_node = dispatch
- **规则**: `task.scope_assessment.is_populated == true` AND `task.decision_shape.is_populated == true` AND `task.scope_assessment.evidence_count > 0`
- **目的**: 强制评估先行，防止 Claude 跳过 assessment 直接写 spec 并 freeze
- **来源**: v0.3.1 §6.3 (R4 A1 修复)

### `inv_no_pending_user_decision_in_autonomous`
- **检查时机**: transition 目标 current_node = dispatch（autonomous-batch 模式下）
- **规则**: IF `batch_state.policy_profile == autonomous-batch` AND `batch_state.user_approval_mode == none` THEN `task.pending_user_decision == false` AND `task.blocker_type != user_confirmation`
- **违反时**: auto-rewrite blocker_type 为 `consult_required` 或 `claude_decision_required`
- **来源**: v0.3.1 §6.3 (R4 A1 修复)

### `inv_completion_state_only_after_review_passed`
- **检查时机**: 任何 transition 目标 task.status = done
- **规则**: 前置必须 `task.review_status == passed`
- **目的**: 扩展 inv_review_before_archive，涵盖所有"标记完成"的语义
- **来源**: v0.3.1 §6.3 (R4 A1 wider invariant)

### `inv_batch_progression_monotonic`
- **检查时机**: scheduler 推进 `batch_state.current_task_id`
- **规则**: 不能回退，除非显式调用 `replan_from_review` 写 rollback_origin
- **注释**: `active_waiting_set` 可以并行含多个任务，不受此规则约束
- **来源**: v0.3.1 §6.3

### `inv_revision_monotonic_cas`
- **检查时机**: 所有 task_state / batch_state 的 mutation
- **规则**: 必须 CAS 写入（new = old + 1）；冲突则回滚 + 重读重算。F7 `engineering_decidable_decisions[]` 虽是 append-only evidence ledger，也必须与同轮 `decision_refs[]` / `batch_state.decision_records[]` 一起遵守 CAS。
- **目的**: 防止脏读（v0.3.1 §8.1 ReAct 陷阱"脏读"）
- **来源**: v0.3.1 §6.3

### `inv_engineering_decision_scope_boundary`
- **检查时机**: decision record append / freeze_spec 前的 engineering-decidable ledger append
- **规则**: `touchpoint ∈ {U2,U3,U5}` 的 engineering-decidable 决策不得改变 kernel canonical 方向、v0.4 schema 时间表或 Epic/Archive 产品语义；`scope.external_contract_impact` 必须为 false；`canonical_consistency.changes_kernel_semantics` 必须为 false。U3 只有 projection-only 且 U1/U4 已 settled 时可走 engineering-decidable。
- **失败行为**: 回滚 mutation + emit invariant_violation；改走 `escalate_to_human`
- **来源**: F7 + Y machine-enforced (v0.3.4)

### `inv_immutable_frozen_artifacts`
- **检查时机**: 任何 Edit/Write 操作目标在 spec/adr/consult_record 文件
- **规则**: spec_frozen / adr_published / consult_round_closed 的产物不能被修改，除非走 replan 流程（replan_from_review primitive 后才允许）
- **目的**: 防止产物震荡（v0.3.1 §8.1）
- **来源**: v0.3.1 §6.3

### `inv_kind_node_consistency_guard`
- **检查时机**: 任何 task_state persist / scheduler transition / task_breakdown hierarchy step
- **规则**: `applicable_kinds(task.current_node) MUST contain task.kind`；`kind=epic` 时 `current_node IS NULL`
- **失败行为**: 回滚 mutation + emit invariant_violation
- **来源**: v0.5.0 hierarchy D2 / 技术设计 §1.7

### `inv_parent_existence_guard`
- **检查时机**: Task INSERT / UPDATE / hierarchy lifecycle handler
- **规则**:
  - `kind=subtask AND parent_epic_id != null` ⇒ `Task[parent_epic_id].kind == 'epic'`
  - parent Epic 与 SubTask 必须 `projectId` 相同且 `requirement_id` 一致
  - `kind=epic` ⇒ `Requirement[requirement_id] EXISTS AND same_project`
- **失败行为**: 回滚 mutation；DB 层由 CHECK/TRIGGER 兜底
- **来源**: v0.5.0 hierarchy D8 / R4 blocker 2

### `inv_all_child_subtasks_archived`
- **检查时机**: `epic__on_all_subtasks_archived__delivering_to_delivered`
- **规则**: 目标 Epic 的所有 active child SubTask 均已进入 `status=done + current_node=archive` 终态
- **失败行为**: transition 保持 delivering，不触发 delivered
- **来源**: v0.5.0 hierarchy lifecycle

### `inv_all_child_epics_delivered`
- **检查时机**: `req__on_all_epics_delivered__delivering_to_delivered`
- **规则**: 目标 Requirement 的所有 child Epic 均为 delivered，且 direct SubTask（若有）均为 `status=done + current_node=archive`
- **失败行为**: transition 保持 delivering
- **来源**: v0.5.0 hierarchy lifecycle

### `inv_source_subtask_belongs_to_target_epic`
- **检查时机**: `epic_replan_requested` 事件消费 / `handler__epic_replan`
- **规则**: `event.source_subtask_id.parent_epic_id == event.target_epic_id`
- **失败行为**: 拒绝 replan handler，emit invariant_violation
- **来源**: v0.5.0 hierarchy D9 / R3 幂等加强

### `inv_epic_replan_not_already_processed`
- **检查时机**: `handler__epic_replan`
- **规则**: `event.failed_review_intent_id` 派生的 idempotency_key 尚未处理过
- **失败行为**: 跳过重复 handler，保留幂等 trace
- **来源**: v0.5.0 hierarchy D9 / R3 幂等加强

---

## 4. L4: PreToolUse Hook Guards（3 条）

### `hook_block_askuser_in_autonomous`
- **拦截工具**: AskUserQuestion
- **触发条件**: `batch_state.policy_profile == autonomous-batch` AND `batch_state.user_approval_mode == none` AND question_body passes `decision_detector`
- **decision_detector**（两阶段匹配 + 负向排除）:
  - **stage_1_verbs（决策动词）**:
    - 中文：选哪个 / 怎么选 / 你来定 / 请决定 / 是否改 / 要不要改 / 保留还是替换 / 采用哪种
    - 英文：which to choose / please decide / choose between / whether to change / keep or replace / which design / which implementation / override
  - **stage_2_objects（决策对象）**:
    - 中文：方案 / 实现 / 接口 / 契约 / 数据结构 / 表结构 / 状态流 / 事务流 / 依赖 / 迁移 / 架构
    - 英文：design / implementation / interface / contract / schema / state flow / transaction flow / dependency / migration
  - **negative_allowlist（豁免）**:
    - file/path/directory/environment/test/summary/log（中英）
  - **匹配规则**: `match = (stage_1 hits) AND (stage_2 hits) AND NOT (negative_allowlist hits)`
- **失败行为**: deny + hint "当前处于 batch autonomous 模式，禁止无 DE Guard 证据的 ask_user_decision。U2/U3/U5 先走 engineering-decidable evidence；U1/U4/U6 才走 escalation 独立 channel"
- **F7 关系**: engineering-decidable evidence path 写 state/decision record，不调用 AskUserQuestion；DE evidence 仅用于真实用户权威升级说明，不得把 U2/U3/U5 可工程裁定事项转成用户问题。
- **来源**: v0.3.1 §6.4 hook_1 + §10.1 词表决议

### `hook_block_archive_writes_before_review`
- **拦截工具**: Write, Edit
- **触发条件**:
  - `target_path` matches `docs/.ccb/specs/archive/*` OR `docs/.ccb/state/*`
  - AND intent 是 mark as done（通过检测 YAML frontmatter diff: status 字段从非 done 转 done）
  - AND `task.review_status != passed`
- **失败行为**: deny + hint "review 通过前不能归档"
- **注释**: intent 判断必须看结构化 diff（status 字段变化），不是看文件内容里有没有"archive/done"字样（后者太脆弱）
- **来源**: v0.3.1 §6.4 hook_2

### `hook_validate_engineering_decidable_evidence`
- **拦截工具**: Write, Edit, MultiEdit, Bash
- **触发条件**:
  - payload 内容包含 `engineering_decidable_decisions` / `engineering_decidable_evidence_status` / `escalation_reason`
  - 或触及 U2/U3/U5 touchpoint marker
- **检查条件**:
  - engineering-decidable record 必须满足 5-of-5：`evidence_list.count >= 2`、`reversibility_class ∈ {reversible, reversible_with_rollback}`、`scope.paths.count >= 1 && scope.external_contract_impact == false`、`tests_ref.count >= 1`、`canonical_consistency.class` 合法且 `changes_kernel_semantics == false`
  - U3 必须 `canonical_consistency.class == u1_u4_settled` 且 `required_decision_refs.count >= 2`
  - U5 或 `reversible_with_rollback` 必须有 `rollback_ref`
  - `escalation_reason ∈ {U1,U4,U6}` 允许；`escalation_reason ∈ {U2,U3,U5}` 且 evidence passed 时 DENY
- **失败行为**: deny locally + remediation hint；不得自动升级用户
- **命令路径**: `.claude/hooks/preusetool-validate-engineering-decidable-evidence.sh`
- **来源**: F7 + Y machine-enforced (v0.3.4)

---

## 5. Guard 调用矩阵

### 5.1 哪些原语会被 L1 守卫拦截

| 原语 | 适用 pre guard |
|---|---|
| consult_codex | pre_codex_mounted |
| explore_codex | pre_codex_mounted |
| dispatch_to_codex | pre_codex_mounted, pre_dispatch_red_flags_clear, pre_dispatch_spec_hash_match, pre_dispatch_current_node_ready, pre_dispatch_idempotency |
| ask_user_decision | pre_ask_user_decision_not_autonomous |
| ask_user_approval | pre_ask_user_approval_not_downgraded |
| write_spec | pre_write_spec_consult_required |
| freeze_spec | pre_freeze_spec_provenance |
| record_decision_provenance | pre_engineering_decision_evidence_complete |
| escalate_to_human | pre_escalation_real_user_authority_required |
| review_codex_receipt | pre_review_idempotency |
| archive_spec | pre_archive_review_passed, pre_archive_idempotency |

### 5.2 哪些原语会触发 L2 副作用守卫

| 原语 | 适用 post guard |
|---|---|
| consult_codex | post_consult_record_appended, post_consult_finding_disposition_recorded, post_decision_via_provenance（如果产生决策） |
| ask_user_decision | post_decision_via_provenance |
| freeze_spec | post_freeze_spec_hash_set |
| review_codex_receipt | post_review_status_set |
| resolve_red_flag | post_resolve_red_flag_status |
| escalate_to_human | post_escalation_recorded |

### 5.3 L3 invariant 触发表（与 transition-table.md 交叉验证）

| transition 类型 | 应用 invariant |
|---|---|
| 任何转移到 archive 节点或 done 状态 | inv_review_before_archive, inv_completion_state_only_after_review_passed |
| dispatch 派工或进入 implementation | inv_dispatch_only_from_dispatch_node |
| 任何转 dispatch 节点 | inv_classification_required_before_dispatch, inv_no_pending_user_decision_in_autonomous (autonomous 模式) |
| scheduler 推进 current_task_id | inv_batch_progression_monotonic |
| 任何 state mutation | inv_revision_monotonic_cas |
| engineering-decidable decision append / freeze | inv_engineering_decision_scope_boundary |
| 任何 spec/adr/consult 文件 Edit/Write | inv_immutable_frozen_artifacts |
| kind/current_node 持久化 | inv_kind_node_consistency_guard |
| parentEpic/requirement 跨行一致性 | inv_parent_existence_guard |
| epic delivered 聚合 | inv_all_child_subtasks_archived |
| requirement delivered 聚合 | inv_all_child_epics_delivered |
| epic replan handler | inv_source_subtask_belongs_to_target_epic, inv_epic_replan_not_already_processed |

### 5.4 L4 hook 拦截工具

| 工具 | 适用 hook |
|---|---|
| AskUserQuestion | hook_block_askuser_in_autonomous |
| Write, Edit | hook_block_archive_writes_before_review |
| Write, Edit, MultiEdit, Bash | hook_validate_engineering_decidable_evidence |

---

## 6. Guard ID 命名规则

- **L1**: `pre_<scenario>` — 描述拦截场景
- **L2**: `post_<effect>` — 描述强制副作用
- **L3**: `inv_<invariant_name>` — 描述不变量
- **L4**: `hook_<intent>` — 描述拦截意图

新增 guard 时：
1. 在本表对应章节追加条目
2. 给定 ID（按命名规则）
3. 写明拦截原语 / 触发时机 / 检查条件 / 失败行为 / 绕过路径 / 来源
4. 更新 §5 调用矩阵
5. 在 manifest / hook 脚本里 ref 该 ID

**禁止**：在 SKILL.md 散文里写"必须先 X 才能 Y"而不在本表登记。

---

## 7. v0.3.2 实施顺序

按优先级（先实现 Q1/Q2 修复 + 状态机基础）：

### Wave 1（必须 v0.3.2 first slice 即生效）
- pre_write_spec_consult_required
- pre_freeze_spec_provenance
- pre_dispatch_red_flags_clear
- pre_dispatch_spec_hash_match
- pre_dispatch_current_node_ready
- pre_dispatch_idempotency
- pre_archive_review_passed
- pre_archive_idempotency
- pre_review_idempotency
- pre_ask_user_decision_not_autonomous
- pre_ask_user_approval_not_downgraded
- post_consult_record_appended
- post_consult_finding_disposition_recorded
- post_decision_via_provenance
- post_freeze_spec_hash_set
- post_review_status_set
- post_resolve_red_flag_status
- post_escalation_recorded
- inv_review_before_archive
- inv_completion_state_only_after_review_passed
- inv_revision_monotonic_cas
- hook_block_askuser_in_autonomous
- hook_block_archive_writes_before_review

### Wave 2（v0.3.3 起引入；v0.3.2 期间可仅以"warn 不阻断"形式存在）
- inv_classification_required_before_dispatch
- inv_no_pending_user_decision_in_autonomous
- inv_dispatch_only_from_dispatch_node
- inv_batch_progression_monotonic
- inv_immutable_frozen_artifacts
- pre_codex_mounted（已有 cping 检查覆盖部分场景，v0.3.2 沿用 ccb-mounted）

### Wave 3（v0.3.4 F7 machine-enforced escalation reclassification）
- pre_escalation_real_user_authority_required
- pre_engineering_decision_evidence_complete
- inv_engineering_decision_scope_boundary
- hook_validate_engineering_decidable_evidence

---

## 8. 引用与依赖

- **依赖于**: state-schema.yaml（fields）、primitive-executor-contract.md（stages 调用时机）
- **被依赖于**: transition-table.md（transition.guard_refs 必须 ref 本表）、node-manifest-schema.yaml（manifest 各处 guard_refs 必须 ref 本表）、PreToolUse hook 脚本（hook ID 必须来自本表）

---

*本文档是 CCB 守卫的唯一注册表。任何"硬规则"必须在此登记后才能在 manifest / hook / 原语里被引用。*
