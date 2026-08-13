# Recent CCB Capabilities

Use this reference to avoid applying pre-v8.5 assumptions to current CCB.
Confirm exact syntax against the local source or current release before acting.

## Provider Authority And Sessions

- Provider authority is resolved per API/token/URL/route/account/profile
  dimension. Explicit CCB configuration wins; missing dimensions inherit
  external Provider state one-way into isolated managed homes.
- Same-authority launches prefer native resume. Authority changes use
  capability-gated fork/import when safe, otherwise a linked continuation.
- A corrupt current Codex session record does not imply conversation loss.
  Recovery should select the latest valid owned session before clear-resume.
- Account, endpoint, model, or inherited environment changes are startup-input
  refresh problems, not automatic reasons to run `ccb clear`.

## Communication And Context

- `ccb ask --chain` is the result-dependent nested-work route. `--silence` is
  only for independent work whose result is not required.
- `ccb followup <active_job_id> --message <correction>` is an exact active-turn
  correction channel. Only `injected` means success; `rejected`, `too_late`,
  or `terminal` requires cancel-and-resubmit when correction is still needed.
- `ccb compact [agent|all]...` checks authoritative outstanding work and sends
  only verified Provider-native compaction commands. Unsupported Providers
  fail closed.
- `completed` means Provider execution ended normally; business acceptance
  still depends on the reply and requested validation.

## Project Command Trust

- `tool_windows.<name>.command` and
  `agents.<name>.provider_command_template` are untrusted project content.
- Execution requires an external receipt for the exact project identity,
  field, and command value. Changed values require reapproval.
- Interactive startup or `ccb config approve-commands` can record deliberate
  approval. Safe mode, script mode, validation, and project ownership do not
  bypass the gate.

## Platforms And Provider Panes

- Native Windows x64 is a beta release lane using WezTerm and Herdr. Current
  process, namespace, registry, endpoint-marker, and readiness evidence is
  platform-owned; never substitute Unix tmux assumptions on native Windows.
- Cursor jobs may execute through a visible Provider Pane. Busy/idle state,
  transcript anchors, and terminal evidence are required; ambiguous state
  defers or fails closed.
- Pi native history and validated native JSONL session restore are available.
  OMP managed homes inherit the intended Provider configuration within CCB's
  storage boundary.

## Mobile And Relay

- The Mobile gateway is a server-wide managed host service that can expose
  multiple running projects and independent host terminal sessions.
- Routes include LAN, tailnet, Cloudflare Tunnel, and Relay. Relay Provider
  controls are capability-negotiated; older hosts remain connectable but must
  show update guidance instead of unsupported controls.
- Invitations, activated credentials, device secrets, and raw Provider
  responses are private host state and must not enter Role memory or reports.

## Source Anchors

- Release notes: `docs/releases/v8.5.6.md` through
  `docs/releases/v8.6.2.md`
- Provider storage/session contracts: `docs/ccb-provider-state-storage-boundary-plan.md`
  and provider-specific session contracts under `docs/`
- Project command trust: `docs/ccb-config-layout-contract.md` and
  `lib/project_command_trust.py`
- Mobile/Relay: `lib/cli/services/mobile.py`,
  `lib/cli/services/mobile_host.py`, and `lib/mobile_gateway/`
- Visible Cursor Pane: search `lib/provider_backends/cursor/` and tests for
  `cursor visible pane` or transcript evidence.
