# CCB Kernel · primitive-executor-contract.md

> **Canonical**: 2 of 6
> **Status**: active (v0.5.1 lifecycle status protocol)
> **Owner**: CCB protocol kernel
> **Authority**: 任何对 dev_task / batch_state 的 mutation 都必须经过本契约描述的 executor wrapper。
> 不允许 skill / scheduler / console 直接读写 state 文件而绕过 executor。
> **Related**:
> - `state-schema.yaml` — 字段定义与写入权限矩阵
> - `guard-registry.md` — pre / post / transition 守卫的统一登记
> - `node-manifest-schema.yaml` — 节点 manifest 内 fixed_actions / subflows 调用 primitive 的 ABI

---

## 0. 本契约的角色

v0.3.1 §10.2 决定：**state mutation 的事务包装层放在 protocol-kernel primitive executor**——既不在 scheduler，也不在 guards。本契约就是这个 wrapper 的执行规范。

**核心承诺**：每次原语调用 = 一个原子事务。要么"读 + 跑 + 校验 + 持久化 + CAS commit + emit event"完整成功；要么完全回滚（包括 dev_task 与 batch_state 的所有变化）。

---

## 1. 执行流水线（6 阶段）

```
┌──────────────────────────────────────────────────────────┐
│  Stage 1: READ                                            │
│    1.1 读 dev_task（载入 task.revision = N_task）           │
│    1.2 读 batch_state（载入 batch_state.revision = N_batch）     │
│    1.3 读取原语声明的 inputs（从 dev_task / batch_state）    │
│    1.4 记录 read_at = iso-8601 timestamp                   │
└─────────────────────┬────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 2: PRE-CONDITION CHECK                             │
│    2.1 加载原语在 guard-registry 中声明的 pre_conditions   │
│    2.2 加载状态机 transition_invariants 中相关条目          │
│    2.3 加载 batch_state.policy_profile / authority         │
│    2.4 全部满足 → 进入 Stage 3                              │
│    2.5 任一不满足 → DENY + emit denial event + END         │
└─────────────────────┬────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 3: RUN（原语自身逻辑）                                │
│    3.1 调用原语 implementation 函数                          │
│    3.2 实现可以是纯计算 / 调用 codex / 写文件 / 触发 SC 等    │
│    3.3 收集 outputs（结构化字段 + 副作用清单）                 │
│    3.4 记录 ran_at = iso-8601 timestamp                     │
│    3.5 任何异常 → 不写 state，emit error event，END         │
└─────────────────────┬────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 4: POST-CONDITION VALIDATE                          │
│    4.1 校验 outputs 字段类型与必填（参见 state-schema）       │
│    4.2 校验原语在 guard-registry 中声明的 post_conditions   │
│    4.3 校验所有"必须 produce"的字段已在 outputs 内            │
│    4.4 任一失败 → 不写 state，emit validation_error，END    │
└─────────────────────┬────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 5: PERSIST + CAS                                    │
│    5.1 计算 new_dev_task（merge old + outputs）              │
│    5.2 计算 new_batch_state（如有 batch 变化）                │
│    5.3 准备 idempotency_key（如适用）                         │
│    5.4 CAS 写 dev_task：                                      │
│         IF disk.task.revision == N_task                      │
│           write new_dev_task with revision = N_task + 1       │
│         ELSE                                                 │
│           emit state_write_conflict event                    │
│           rollback ALL stage 3-5 changes                     │
│           END                                                │
│    5.5 CAS 写 batch_state（如适用，同样规则）                 │
│    5.6 写入 idempotency_log（如适用）                         │
└─────────────────────┬────────────────────────────────────┘
                      ▼
┌──────────────────────────────────────────────────────────┐
│  Stage 6: EMIT EVENT                                       │
│    6.1 构造 reactive-event-v1 schema 事件                    │
│    6.2 写到 batch_state.execution_trace                      │
│    6.3 推送到 reactive scheduler 事件总线（v0.4 实现；         │
│        v0.3.2 仅写 trace）                                   │
│    6.4 标记 transaction END                                  │
└──────────────────────────────────────────────────────────┘
```

---

## 2. 阶段细节规范

### 2.1 Stage 1: READ

**必须做**：
- 每次原语调用都重新读 dev_task 与 batch_state，**不允许跨原语缓存**
- 读取 batch_state 的 policy_profile / authority_boundaries / loop_budget 作为 stage 2 的输入

**不能做**：
- 不能在 stage 1 写任何字段
- 不能跨原语保留 in-memory 状态对象

**异常处理**：
- 文件不存在 → 由调用方决定是否触发 scaffold（譬如 load_project_index 在 document-map 缓存缺失时触发 scan_project_facts）
- 文件损坏 / parse 失败 → emit `state_corrupted` 事件，原语 abort

### 2.2 Stage 2: PRE-CONDITION CHECK

**校验三类规则**（按顺序）：

1. **原语自身 pre_conditions**（来自 guard-registry pre 段）
   - 例：`dispatch_to_codex` 要求 `task.open_red_flags 全部 != open`
2. **状态机 transition_invariants**（来自 guard-registry transition 段）
   - 例：`completion_state_only_after_review_passed`
3. **PreToolUse hook 等价规则**（v0.3.2：直接静态检查；v0.4：调用 hook 引擎）
   - 例：autonomous-batch 模式下 `ask_user_decision` 直接 DENY

**DENY 行为**：
- 不进入 stage 3-6
- 写 `batch_state.execution_trace` 一条 `actual_result: denied` 记录
- 推送 `tool_call_denied` 事件
- 返回结构化 hint：`{ denied_primitive, guard_id, deny_reason, hint }`
- **不能"半执行"**

### 2.3 Stage 3: RUN

**实现自由度**：
- 原语可以读写文件、调用 codex (ask)、调用 SC（/sc:*）、调用 sub-agent 等
- 必须在 ≤ 原语声明的 timeout 内完成（默认 1200s，consult_codex 可达 1800s）
- 跨进程调用（譬如 ask codex）必须保留 correlation_id，便于 stage 6 写事件

**禁止**：
- 不能直接写 dev_task / batch_state 文件（必须经 stage 5）
- 不能 mutate 共享内存对象
- 不能跳过 stage 4 直接持久化

### 2.4 Stage 4: POST-CONDITION VALIDATE

**校验内容**：
- outputs 字段是否齐全（参见每个原语在 §3 的 outputs 声明）
- outputs 类型是否匹配 state-schema
- post_conditions 是否被满足（譬如 `consult_codex` 必须产生 consult_record）

**失败行为**：
- 不写 state（保护原子性）
- emit `validation_error` 事件
- 抛出供调度器决策（通常是 retry 或 escalate）

### 2.5 Stage 5: PERSIST + CAS

**CAS 算法**：

```pseudo
function cas_write(file_path, expected_revision, new_state):
    with file_lock(file_path):
        disk_state = read(file_path)
        if disk_state.revision != expected_revision:
            raise StateWriteConflict(expected_revision, disk_state.revision)
        new_state.revision = expected_revision + 1
        write_atomic(file_path, new_state)  # write to .tmp + rename
    return new_state.revision
```

**冲突处理**：
- 单次冲突 → executor 自动重试一次（重读 → 重跑 stage 2-4 → 再 CAS）
- 连续 2 次冲突 → 抛 `state_write_conflict` 事件给调度器，原语 abort

**幂等键登记**：
- `dispatch_to_codex` / `review_codex_receipt` / `archive_spec` 三个原语必须在 stage 5 写 `batch_state.idempotency_log.<class>` 一条 `{ key, executed_at }` 记录
- 幂等键格式：`sha256(task_id + step + revision)`
- 在 stage 2 即检查"key 是否已在 log 中"，是则 DENY（防止 hook replay / resume 重复执行）

### 2.6 Stage 6: EMIT EVENT

**事件 schema**（reactive-event-v1，参见 v0.3.1 §10.6）：

```yaml
event:
  event_id: uuid
  event_type: enum  # 见下表
  emitted_at: iso-8601
  batch_id: string
  task_id: string
  source_actor: claude | codex | user | system
  source_component: scheduler | primitive_executor | guard | hook
  causation_id: string  # 因果链上一个 event ID
  correlation_id: string  # 请求-响应匹配
  state_revision_seen: int
  idempotency_key: string  # 防重放
  payload: object  # 事件特定字段
```

**事件类型**（v0.3.1 §10.6 原 7 种 + v0.3.2 新增 2 种 = **9 种**，v0.3.2 期间全部生效）：
1. `codex_receipt_ready`
2. `user_arbitration_submitted`
3. `session_resumed`
4. `state_write_conflict`
5. `verification_finished`
6. `batch_cancelled`
7. `tool_call_denied`
8. **`codex_picked_up`**（v0.3.2 新增）— codex 接受派工，触发 `dispatch__on_codex_pickup__to__implementation` transition
9. **`codex_rejected`**（v0.3.2 新增）— codex 已挂载但拒接派工（spec 不可读 / bounceback 触发 / 并发限制等），触发 `dispatch__codex_rejected__to__terminal` transition

**事件去重**：所有外部事件（含 codex_picked_up / codex_rejected 等 9 种）消费时**仅按 `event_id` 去重**（参见 state-schema.yaml `batch_state.consumed_events` 的 `dedupe_key: event_id` 规定）。`idempotency_key` 字段保留作为**审计字段**（记录事件来源的原语幂等键），不参与 dedupe。每个 `on_external_event` 类 transition 消费事件前必须在 `batch_state.consumed_events` 中检查 `event_id` 是否已存在；同一事件不得两次更新 state（详见 transition-table.md 各 on_external_event transition 的 idempotency 段）。

### 2.6.1 Transition consumer wrapper

`consume_external_event_transition` is the executor wrapper for `transition-table.md` entries whose trigger is `on_external_event`.

It is not a new transition definition and MUST NOT invent state effects. It may only apply a transition already defined in `transition-table.md`.

For each consumed event it MUST:
1. read dev_task and batch_state with their revisions;
2. check transition eligibility and event dedupe by `batch_state.consumed_events[].event_id`;
3. apply exactly the transition-table state_effects;
4. append one `batch_state.consumed_events[]` record;
5. CAS-write dev_task and batch_state;
6. emit/record projection refresh evidence for Console-derived views.

`idempotency_key` remains audit-only and MUST NOT participate in dedupe.

**v0.3.2 落地范围**：
- 必须写入 `batch_state.execution_trace`（用于审计 + resume）
- 不必推送到 reactive scheduler 总线（v0.4 才实现）

---

## 3. 原语分类与触发规则

### 3.1 Mutation 类原语（19 个，触发完整 6 阶段流水线）

| 原语 | 类别 | 主要 mutation | 幂等性 |
|---|---|---|---|
| assess_task_scope | Assessment | task.scope_assessment | 否 |
| assess_decision_shape | Assessment | task.decision_shape | 否 |
| consult_codex | Coordination | task.consult_records (append) + task.open_red_flags (append) | 否（每轮 append） |
| explore_codex | Coordination | task.explore_records (append) | 否 |
| ask_user_approval | Coordination | task.approval_records (append) | 否 |
| ask_user_decision | Coordination | task.pending_user_decision + 触发 record_decision_provenance | 否 |
| write_requirement_doc | Artifact | 写文件 + task.requirement_doc_path | 否 |
| write_design_doc | Artifact | 写文件 | 否 |
| write_spec | Artifact | 写文件 + task.spec_path | 否 |
| write_adr | Artifact | 写文件 | 否 |
| freeze_spec | Artifact | task.spec_hash | 是（hash 重算等价） |
| dispatch_to_codex | Execution | dispatch brief 提交 + idempotency_log.dispatch；status 保持 reviewing | **是** |
| review_codex_receipt | Execution | task.review_status + idempotency_log.review | **是** |
| run_verification | Execution | task.verification_result | 是 |
| archive_spec | Execution | 移动文件 + status 转 done + idempotency_log.archive | **是** |
| record_decision_provenance | Governance | batch_state.decision_records (append) | 否 |
| escalate_to_human | Governance | task.runtime_state 转 escalated + batch_state.escalations + active_waiting_set(waiting_for=user_arbitration) | 否 |
| mark_waiting | Governance | task.waiting_state / runtime_state + batch_state.active_waiting_set | 是 |
| replan_from_review | Governance | task.rollback_origin + node_substate=replanning | 否 |
| resolve_red_flag | Governance | task.open_red_flags[i].status 转 resolved_* | 是（已 resolved 再调等价） |

### 3.2 Read 类原语（3 个，跳过 stage 4-6 持久化）

| 原语 | 行为 |
|---|---|
| load_project_index | 读 docs/.ccb/index/document-map.json、docs/00_文档地图.md、docs/00_项目总览.md 与 docs/.ccb/docs-structure-contract.yaml；缓存缺失时触发 scan_project_facts |
| load_work_state | 读 dev_task + batch_state，设 loop.state_revision = loaded_revision |
| read_spec | 读 active spec 或草稿 |

**Read 类原语的特殊规则**：
- 仍然走 stage 1（读取）+ stage 2（pre-condition，譬如 `read_spec` 要求 spec_path 存在）
- 跳过 stage 3 之后的 mutation / persist / emit
- 仍然写一条 `execution_trace` 记录但不增加 revision

### 3.3 Scheduler-only 操作（不是原语）

以下不是原语，由调度器直接处理（参见 v0.3.1 §5.3）：

| 操作 | 谁做 |
|---|---|
| 写 dev_task（除原语 mutation 外） | 节点引擎 / 调度器 |
| 写 batch_state（除幂等 log / decision_records 外） | 调度器 |
| invoke_sc_*（SuperClaude 调用） | 隐藏在 consult_codex / assess_task_scope 内部 |
| scan_project_facts | 隐藏在 load_project_index 缓存缺失时；生成/刷新 document-map 缓存与项目事实摘要 |

---

## 4. checkpoint 触发规则（隐式 batch_state CAS）

某些原语执行成功后，必须额外触发 batch_state 的 implicit checkpoint（即使原语本身不 mutate batch）：

| 触发原语 | implicit batch checkpoint 内容 |
|---|---|
| `freeze_spec` | batch_state.tasks[task_id].current_node 可能转移 → batch_state.revision +=1 |
| `dispatch_to_codex` | batch_state.tasks[task_id].runtime_state + active_waiting_set → batch_state.revision +=1 |
| `review_codex_receipt` | batch_state.tasks[task_id].review_status + active_waiting_set 移除 → batch_state.revision +=1 |
| `archive_spec` | batch_state.tasks[task_id].status(done) + batch_state.current_task_id 推进 → batch_state.revision +=1 |
| `escalate_to_human` | batch_state.escalations append + batch_state.current_task_id suspend → batch_state.revision +=1 |
| `mark_waiting` | batch_state.active_waiting_set append → batch_state.revision +=1 |
| `record_decision_provenance` | batch_state.decision_records append → batch_state.revision +=1 |

**Read 类原语 + 不影响 batch 的 mutation 原语**（譬如 `assess_task_scope`）：不触发 batch checkpoint。

---

## 5. 错误分类与回滚

| 错误类别 | Stage | 行为 | 回滚范围 |
|---|---|---|---|
| 文件不存在 / 损坏 | 1 | abort + emit `state_corrupted` | 无（未做任何写） |
| pre-condition denied | 2 | DENY + emit `tool_call_denied` | 无 |
| RUN 抛异常 | 3 | abort + emit error event | 无 |
| post-condition validate fail | 4 | abort + emit `validation_error` | 无（state 未写） |
| CAS 冲突 | 5 | 自动重试 1 次；失败则 emit `state_write_conflict` | 已写部分回滚（task / batch 都要） |
| event emit 失败 | 6 | 记录但不回滚 state | 无（state 已成功写入，trace 记录失败原因） |

**回滚机制**：
- v0.3.2 阶段：write_atomic 使用 `.tmp` + rename 策略；CAS 失败时直接删除 .tmp，不影响磁盘
- 跨文件原子性（dev_task + batch_state 双写）：先写 task，再写 batch；如果 batch CAS 失败，**用先前 N_task revision** 重写 task（恢复初值）

---

## 6. 与节点引擎的接口

节点 manifest 在 `fixed_actions[].action_type = primitive` 时，引擎按本契约调用原语：

```pseudo
function execute_node_action(action, dev_task, batch_state):
    primitive_name = action.ref
    inputs = resolve_inputs(action, dev_task, batch_state)
    result = primitive_executor.run(primitive_name, inputs)
    # 6 阶段流水线在 primitive_executor.run 内执行
    return result  # { ok | denied | error, outputs?, hint? }
```

节点引擎根据 result 决定：
- `ok` → 执行 action.on_success（next / complete / wait）
- `denied` → 写 trace + 走 action.on_failure（escalate / fail_node）
- `error` → 同上，但同时通知调度器记录系统错误

---

## 7. v0.3.2 实现边界

### 7.1 必须实现

- 6 阶段完整流水线（任何 mutation 走 wrapper）
- CAS 写入 + write_atomic（.tmp + rename）
- 幂等键登记（dispatch / review / archive 三类）
- pre/post 守卫执行
- execution_trace 记录每次调用

### 7.2 v0.3.2 可简化

- reactive event bus 推送：仅写 trace，不推送
- 跨文件原子回滚：实现"先 task 后 batch"顺序，单元测试覆盖回滚路径
- hook 引擎：v0.3.2 直接静态规则；v0.4 才接入 PreToolUse hook 引擎

### 7.3 不做

- 多进程并发的 distributed lock：v0.3.2 假设单 Claude session 写
- batch_state 跨项目共享：不在范围

---

## 8. 与 v0.3.1 的差异

| 差异点 | v0.3.1 描述 | v0.3.2 落地 |
|---|---|---|
| transaction wrapper 位置 | §10.2 决议放 primitive executor | 本文档 §1 落地 |
| read-run-validate-persist-cas-emit | §10.2 抽象描述 | 本文档 §1-§2 详细规范 |
| mutation 19 / read 3 | §10.2 触发清单 | 本文档 §3 完整列表 |
| 幂等键格式 | §5.2.5 散文 | 本文档 §2.5 + §5 公式化 |
| CAS 冲突处理 | §6.3 invariant | 本文档 §2.5 + §5 retry 策略 |

**v0.3.2 新增**：
- 节点引擎接口（§6）
- v0.4 兼容字段处理（execution_trace.node 字段）
- write_atomic 实现策略（.tmp + rename）

---

## 9. 引用与依赖

- **依赖于**：state-schema.yaml（字段类型 + 写入权限矩阵）
- **被依赖于**：所有 19 个 mutation 原语的实现都必须遵守本契约
- **校验工具**：v0.3.2 manifest lint 工具会校验 manifest fixed_actions 调用的 primitive 是否存在；不校验 executor 实现（运行时校验）

---

*本文档是 CCB primitive executor 的执行契约。任何 state mutation 实现都必须按本契约执行 6 阶段流水线。违反者会被 manifest lint + executor 双重拦截。*
