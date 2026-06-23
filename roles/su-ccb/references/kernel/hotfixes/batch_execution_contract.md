# CCB Hotfix · Batch Execution Contract

- **Status**: v0.3.3 hotfix
- **Date**: 2026-04-23
- **Scope**: autonomous batch authorization, progress, stop, resume, and failure behavior
- **Authority**: hotfix rule; does not replace `state-schema.yaml`, `registries/transition-table.md`, `registries/guard-registry.md`, or node manifests

---

## 1. Purpose

Make autonomous-batch execution explicit. A batch is not inferred from natural language alone; it must have a bounded authorization count, a current-slice marker, and a stop policy before Claude continues across slices without asking again.

## 2. Canonical Boundary

This hotfix references existing canonical sources and does not define new transition IDs, guards, capabilities, primitives, node IDs, or state-schema fields.

| Area | Canonical source |
|---|---|
| Node flow | `references/kernel/nodes/*.node.yaml` |
| Transitions | `references/kernel/registries/transition-table.md` |
| Guards | `references/kernel/registries/guard-registry.md` |
| State fields | `references/kernel/state-schema.yaml` |
| Tool/hook behavior | Existing project hooks and skills |

`batch_progress` is an informal projection used by current state files for observability. It may mirror `batch_id`, `target_slices`, `current_index`, `current_slice_status`, and `batch_complete`, but it is not made canonical by this hotfix.

## 3. Start Scope

| Rule | Requirement |
|---|---|
| Explicit command | Autonomous batch starts from `/ccb:su-batch <N>` or an equivalent user authorization that states the target slice count. |
| Count range | `N` must be an integer from 1 to 20. Values outside the range require a new user decision. |
| Scope | Authorization applies only to the current project, current batch, and listed slice sequence. |
| Policy | The active task or batch container records `policy_profile=autonomous-batch` or an equivalent downgraded approval mode. |

## 4. Stop Policy

| Stop condition | Required behavior |
|---|---|
| Slice failure | Stop the batch and report the failed slice, evidence, and next recommended action. |
| Contract conflict | Stop when a slice needs schema, transition, guard, capability, permission, or cross-slice contract changes not already authorized. |
| User cancellation | Stop immediately and preserve completed slice artifacts. |
| Safety guard | Stop when a hook, hotfix guard, or external provider state check blocks continuation. |
| Count reached | Stop after `current_index == target_slices`, then summarize completion. |

## 5. Resume Boundary

| Resume state | Behavior |
|---|---|
| Last slice archived and count remains | Resume from the next planned slice after re-reading state and checking `spec_hash`. |
| Last slice dispatched or running | Do not redispatch; inspect provider state and artifacts first. |
| Last slice failed or blocked | Resume only after the blocking reason is resolved or explicitly re-scoped. |
| Batch metadata missing | Do not infer batch continuation from chat history alone; ask for `/ccb:su-batch <N>` or equivalent authorization. |

## 6. Current Slice Semantics

| Item | Meaning |
|---|---|
| Current slice | The single slice whose state is not archived/completed and whose `batch_index` or `batch_progress.current_index` is the active cursor. |
| Cursor source | Prefer explicit `batch_index` / `batch_target_slices`; fall back to `batch_progress.current_index` / `target_slices` when present. |
| Identity | Current slice identity is the task state `task_id`, not the chat turn or provider wrapper ID. |
| Completion | A slice is complete only after review/archive criteria are satisfied for that slice. |

## 7. Failure Policy

| Case | Behavior |
|---|---|
| Single slice fails before archive | Stop the batch; do not advance `current_index`. |
| Some slices archived | Preserve archived states and artifacts; future resume starts after the last archived slice. |
| Wrapper failure | Apply State Check Guard before treating the slice as failed. |
| Verification failure | Keep the slice active, report failing checks, and do not start the next slice. |

## Provenance

Derived from 2026-04-23 CCB v0.3.3 R7/R8 reflection after 13 autonomous slices. Codex identified Batch Execution Contract as the most blocking missing enforcement contract.
