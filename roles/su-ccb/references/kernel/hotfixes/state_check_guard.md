# CCB Hotfix · State Check Guard

- **Status**: v0.3.2 hotfix
- **Date**: 2026-04-23
- **Scope**: verify external async provider state before retry
- **Authority**: hotfix rule; does not replace `registries/guard-registry.md`

---

## 1. Purpose

Prevent duplicate dispatch or double execution when an outer wrapper fails but the provider daemon is still running. Wrapper exit status and provider execution state are separate signals.

## 2. Required Checks

| Check | Meaning |
|---|---|
| `ccb-mounted` | whether provider daemon/session is online |
| `pend <provider>` | whether provider has pending/running output |
| filesystem artifacts | whether the task produced files or partial outputs |
| state file | whether `docs/.ccb/state/<task>.md` changed |

## 3. Decision Matrix

| Observed state | Behavior |
|---|---|
| daemon offline + no artifacts | retry is allowed |
| daemon online + `pend` shows progress | do not retry; wait for completion |
| daemon online + no `pend` + partial artifacts | inspect artifacts and manually verify |
| wrapper exit != 0 + `pend` running | trust provider state; wrapper and provider are decoupled |

## 4. Trigger Points

| Trigger | Required action |
|---|---|
| `ask ... --foreground` exits non-zero | check provider state before retry |
| command output is empty | check `pend` before assuming no execution |
| task is long-running | inspect daemon and pending state first |
| user says provider is still running | stop retry path immediately |

## 5. Retry Rule

| Case | Behavior |
|---|---|
| provider is actively running | retry is forbidden |
| provider finished with no output and no artifacts | retry may be considered |
| provider produced partial output | verify and reconcile before any retry |
| wrapper failed before provider start | retry may be allowed after daemon check |

## 6. Violation Example

| Drift | Correction |
|---|---|
| `ask codex --foreground` exits 255 with empty output, so dispatch again | run `ccb-mounted`, `pend codex`, inspect artifacts/state, then decide |

## Provenance

Derived from 2026-04-23 Slice 07 real-run. `ask codex --foreground` returned bash exit 255 with empty output, Claude proposed retry, and the user interrupted because Codex was still executing. Later checks showed the Codex daemon was online and actively handling Slice 07; retry would have created a double-dispatch race.
