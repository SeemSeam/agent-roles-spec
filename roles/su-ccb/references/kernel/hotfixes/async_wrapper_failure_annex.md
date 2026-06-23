---
annex_id: async_wrapper_failure_annex
extends: state_check_guard
status: v0.3.3 annex
date: 2026-04-23
scope: failure classification for asynchronous provider wrappers
authority: annex; does not replace `state_check_guard.md`
---

# CCB Hotfix Annex · Async Wrapper Failure Classification

- **Status**: v0.3.3 annex
- **Date**: 2026-04-23
- **Parent**: `references/kernel/hotfixes/state_check_guard.md`
- **Scope**: provider, tool, wrapper, and task failure classification
- **Authority**: classification annex; does not define transitions, guards, capabilities, primitives, or state-schema fields

---

## 1. Purpose

Classify asynchronous execution failures before retrying, redispatching, or marking a CCB task as failed.

State Check Guard defines **what must be inspected** before acting on uncertain execution state. This annex defines **how to classify** the observed signal once the inspection evidence exists.

The core rule is: a non-zero outer command exit is only a signal. It is not proof that the underlying task failed.

## 2. Boundary

This annex is a narrow extension of State Check Guard. It does not replace the parent rule and does not add canonical CCB kernel behavior.

| Item | Boundary |
|---|---|
| Parent rule | `state_check_guard.md` remains the source for required state checks |
| Classification | This annex names four failure levels and their handling |
| Runtime behavior | Existing hooks, skills, provider wrappers, and state files remain unchanged |
| Canonical kernel | No transition, guard, capability, primitive, or schema field is defined here |

## 3. Classification Order

Classify in this order whenever an asynchronous wrapper, provider command, or external tool returns an ambiguous error:

1. Provider failure
2. Tool failure
3. Wrapper failure
4. Task failure

The order is intentionally conservative. It prevents a transport or wrapper signal from being escalated into a task failure before the actual provider/task state is checked.

## 4. Provider Failure

Provider failure means the AI provider session, daemon, mount, credential, or remote endpoint is unavailable before the task can be observed reliably.

| Required item | Rule |
|---|---|
| Typical signals | `ccb-mounted` reports provider offline; `pend <provider>` cannot find a session; provider CLI cannot authenticate; provider daemon is not running |
| Handling action | Check mounted/session state first, then retry only the provider connection or ask Claude to re-scope dispatch if the provider remains unavailable |
| Misclassification consequence | Treating provider failure as task failure can create false replan/retry records for work that never started |

Provider failure is about reachability and session existence. It is not about code correctness, build output, or task artifacts.

## 5. Tool Failure

Tool failure means a deterministic local tool or command failed inside a task, verification step, or helper script.

| Required item | Rule |
|---|---|
| Typical signals | `pnpm build` fails; `pnpm test` fails; `prisma generate` hits EPERM; `git worktree` exits with an expected error; `python lint_all.py` reports failed rules |
| Handling action | Preserve the failing command output, fix or report the local cause, and rerun the same verification after the change |
| Misclassification consequence | Treating tool failure as wrapper failure can hide a real implementation defect and allow the batch to continue incorrectly |

Tool failure has an identifiable command, deterministic output, and usually a local remediation path.

## 6. Wrapper Failure

Wrapper failure means the outer async launcher, shell wrapper, background process, or bridge returned an error while the underlying provider task may still be running or may already have completed.

| Required item | Rule |
|---|---|
| Typical signals | Async launcher exits non-zero but provider session still exists; foreground command exits before background task finishes; duplicate dispatch risk appears; wrapper reports timeout without provider-side failure evidence |
| Handling action | Apply State Check Guard: inspect provider state, pending output, task artifacts, and state file before retrying or redispatching |
| Misclassification consequence | Treating wrapper failure as task failure can double-dispatch the same slice, race file writes, or interrupt a completed provider task |

Wrapper failure is the main target of this annex. The safe default is "inspect before retry", not "retry immediately".

## 7. Task Failure

Task failure means the actual CCB task execution failed after the provider/task state is observable.

| Required item | Rule |
|---|---|
| Typical signals | Provider final response reports failure; required artifacts are missing; required tests remain red after implementation; state file records blocked/failed status; validation criteria are not met |
| Handling action | Stop autonomous batch advancement, report evidence, and let Claude choose review, replan, or a new dispatch according to the current node rules |
| Misclassification consequence | Treating task failure as wrapper failure can cause endless polling, hide a real blocked slice, and delay replan/review decisions |

Task failure is the last classification because it has the highest process impact.

## 8. Decision Tree

Use this decision tree when the observed signal is ambiguous:

1. Can the provider/session be reached?
   - No: classify as **Provider failure**.
   - Yes: continue.
2. Did a deterministic local tool fail with direct output?
   - Yes: classify as **Tool failure**.
   - No: continue.
3. Did only the outer launcher/wrapper fail while provider state or task artifacts remain uncertain?
   - Yes: classify as **Wrapper failure** and run State Check Guard before retry.
   - No: continue.
4. Does provider output, task state, or verification evidence show the slice itself failed?
   - Yes: classify as **Task failure**.
   - No: keep the task in an unknown state and gather evidence; do not retry blindly.

Non-zero exit code alone is insufficient evidence for task failure.

## 9. Real Counterexample

Slice-07 `ccb-mvp-slice-07-m5-review-gate` produced an outer wrapper failure signal:

| Evidence | Observation |
|---|---|
| State file | `docs/.ccb/state/2026-04-23-ccb-mvp-slice-07-m5-review-gate.md` |
| Wrapper signal | `dispatch_bash_exit_code: 255` |
| Later state evidence | `dispatch_wrapper_failed_but_codex_ran: true` |
| Guard evidence | `ccb-mounted + pend codex confirmed codex active; retry aborted` |

The incorrect action would have been to retry immediately after exit 255. The correct action was to classify the signal as wrapper-level, inspect provider/task state, and avoid double dispatch.

## 10. Quick Matrix

| Level | Question | Safe next action |
|---|---|---|
| Provider | Can the provider/session be reached? | Reconnect or re-scope dispatch |
| Tool | Did a local deterministic command fail? | Fix/report command failure and rerun verification |
| Wrapper | Did the launcher fail while provider state is uncertain? | Inspect provider/task state before retry |
| Task | Did the actual slice fail? | Stop batch advancement and enter review/replan path |

## 11. Non-Goals

- This annex does not add a new CCB node.
- This annex does not add a transition, guard, capability, primitive, or state-schema field.
- This annex does not prescribe a provider implementation.
- This annex does not define batch authorization; use `batch_execution_contract.md` for that boundary.
- This annex does not change `state_check_guard.md`.

## Provenance

Derived from the 2026-04-23 v0.3.3 enforcement consolidation discussion and the Slice-07 asynchronous wrapper incident, where a wrapper exit code was initially at risk of being treated as task failure until provider/task state was checked.
