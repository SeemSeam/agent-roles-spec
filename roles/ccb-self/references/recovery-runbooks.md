# Recovery Runbooks

## Diagnostic Ladder

1. Confirm project anchor and mounted daemon generation.
2. Read current daemon graph and compare disk/tmux only as evidence.
3. Check target runtime record, pane evidence, provider activity, queue, inbox,
   trace, recent logs, and artifact state.
4. Check `ccb fault list` and classify active fault-injection rules as
   diagnostic evidence or test residue.
5. Classify the failure domain.
6. Choose the least disruptive supported repair.

## Provider/API Fault

1. Classify auth, quota/rate limit, model mismatch, endpoint/base URL, network,
   or provider outage without reading secrets.
2. Use `ccb-config` only for existing or user-supplied safe provider/model/base
   URL/profile/env-var references.
3. Run `ccb config validate`.
4. Run `ccb reload --dry-run`.
5. Run `ccb reload` only after gates and materialization intent.
6. Re-check affected agents.
7. If stale provider process/context remains, use `ccb-self-recover` guarded
   single-agent restart with `ccb restart <agent>` when busy checks pass.

Do not clear context merely because Provider authority changed. First verify
per-dimension inheritance and whether the stopped generation can resume, safely
fork/import, or create a linked continuation. If the current Codex session
record is corrupt, select the latest valid owned session before clear-resume.

## Project Command Approval Block

1. Read the exact protected field and command shown by CCB.
2. Confirm it is an intended project command, not injected or unexpected
   project content.
3. Run `ccb config approve-commands` only with explicit approval intent.
4. Re-run validation/start/reload as applicable.
5. Never bypass with safe mode or script mode; changed values require a fresh
   receipt.

## Mobile Or Relay Incident

1. Route to `ccb-mobile-relay-maintain`.
2. Separate server-wide host generation and route authority from project Pane
   state.
3. Inspect sanitized health, endpoint ownership, pairing/device state, project
   discovery, and negotiated capabilities.
4. Refresh with `ccb update mobile` only when replacement/rotation is intended.
5. Revoke only an exact device/invitation/host after explicit user intent.

## Interrupted Chain

1. Use `ccb trace <id>`.
2. Read full artifact files before acting.
3. Pick `repair retry`, `repair resubmit`, or `repair ack` from lineage
   evidence.
4. Restart only after lineage evidence proves process/context recovery is
   needed.

## Communication Reply Stalled

1. Use `ccb-comm-reply-recover` when a user says a CCB reply did not arrive,
   an agent remains `busy`/`delivering`, work is queued behind active work, an
   artifact is empty, or a mailbox appears stuck.
2. Trace lineage with `ccb trace <id>` before any repair.
3. Inspect `ccb queue --detail <agent>` and
   `ccb pend --inbox --detail <agent>` for the active head-of-line event.
4. If the user's job is queued behind an active event, trace and repair the
   active event first.
5. Cross-check `ccb ps`, `ccb ping <agent>`, `ccb doctor logs <agent>`, and
   read-only tmux pane evidence from the socket/pane reported by `ccb ps`.
6. Cancel stale active jobs before retrying or resubmitting work.
7. Do not restart when the next queued job enters the provider pane and is
   making progress.
8. After a valid reply completes, cancel duplicate retries for the same work.
9. Hand off to `ccb-self-recover` for guarded restart only when active work is
   clear and provider evidence still shows stale, dead, or unusable state.

## Pane Missing Or Stuck

1. Treat tmux facts as evidence.
2. Confirm the target is in the current daemon graph.
3. Check busy/pending state.
4. Use `ccb restart <agent>` when safe.
5. Do not use raw tmux mutation.
