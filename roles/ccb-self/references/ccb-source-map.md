# CCB Source Map

Use this map to answer "where is this implemented" and "which tests prove it".
Paths are repo-relative to a CCB source checkout.

## CLI

- Entry and early routing: `lib/cli/entrypoint_runtime.py`
- Runtime router: `lib/cli/router.py`
- Parser facade: `lib/cli/parser.py`
- Runtime command parser: `lib/cli/parser_runtime/commands.py`
- Ask parser: `lib/cli/parser_runtime/ask.py`
- Fault parser: `lib/cli/parser_runtime/fault.py`
- Ask usage text: `lib/cli/ask_usage.py`
- Active-turn followup and native context compaction: search
  `ParsedFollowupCommand`, `project_followup`, and `project_compact_context`.

## CLI Services

- Ask submission: `lib/cli/services/ask.py`
- Ask runtime submission: `lib/cli/services/ask_runtime/submission.py`
- Queue/inbox/pend/watch/trace/ack services:
  `lib/cli/services/queue.py`, `lib/cli/services/inbox.py`,
  `lib/cli/services/pend.py`, `lib/cli/services/watch.py`,
  `lib/cli/services/trace.py`, and `lib/cli/services/ack.py`
- Config validate: `lib/cli/services/config_validate.py`
- Project command approval: `lib/project_command_trust.py` and
  `lib/cli/phase2_runtime/handlers_start.py`
- Restart service: `lib/cli/services/restart.py`
- Mobile host and Relay operator services: `lib/cli/services/mobile.py`,
  `lib/cli/services/mobile_host.py`, and `lib/cli/services/relay_operator.py`
- Agentic loop, PlanTask, and role-output import: `lib/cli/services/loop_*.py`,
  `lib/cli/services/plan_*.py`, and `lib/cli/services/role_output_import.py`
- Role commands: `lib/cli/roles_runtime/commands.py`

## Daemon And Dispatcher

- Socket client endpoints: `lib/ccbd/socket_client_runtime/endpoints.py`
- Submit, watch, queue, inbox, ack, trace handlers:
  `lib/ccbd/handlers/`
- Single-agent restart handler: `lib/ccbd/handlers/project_restart.py`
- Dispatcher facade and state: `lib/ccbd/services/dispatcher_runtime/`
- Job start, polling, finalization, chains:
  `lib/ccbd/services/dispatcher_runtime/lifecycle_start_runtime/`,
  `lib/ccbd/services/dispatcher_runtime/polling_service.py`,
  `lib/ccbd/services/dispatcher_runtime/finalization_runtime/`, and
  search the dispatcher runtime for chain/callback compatibility internals.

## Message Bureau And Mailbox

- Models: `lib/message_bureau/models.py`
- Facade and stores: `lib/message_bureau/facade.py`,
  `lib/message_bureau/store.py`
- Submission, terminal attempts, terminal replies:
  `lib/message_bureau/facade_recording_submission.py`,
  `lib/message_bureau/facade_recording_terminal_attempts.py`,
  `lib/message_bureau/facade_recording_terminal_replies.py`
- Chain edges and control queue (some internal compatibility names still use
  `callback`):
  `lib/message_bureau/callback_edges.py`,
  `lib/message_bureau/control_queue.py`
- Mailbox kernel: `lib/mailbox_kernel/`

## Config And Roles

- Config loader entry: `lib/agents/config_loader.py`
- Config runtime common/io/parsing/defaults:
  `lib/agents/config_loader_runtime/`
- Topology parsing: `lib/agents/config_loader_runtime/parsing_runtime/topology.py`
- Agent specs:
  `lib/agents/config_loader_runtime/parsing_runtime/agent_specs.py`
- Provider profiles:
  `lib/agents/config_loader_runtime/parsing_runtime/provider_profiles.py`
- Role lookup: `lib/agents/config_loader_runtime/role_lookup.py`
- Role Pack services: `lib/rolepacks/`
- Project command trust receipts: `lib/project_command_trust.py`

## Provider Runtime

- Provider backends: `lib/provider_backends/`
- Mobile/Relay runtime: `lib/mobile_gateway/`
- Native Windows/Herdr runtime: `lib/platforms/windows/` and
  `platforms/windows/`
- Provider-state storage boundary:
  `docs/ccb-provider-state-storage-boundary-plan.md`
- Provider completion contract:
  `docs/managed-provider-completion-reliability-plan.md`
- Codex/Claude/Gemini/OpenCode session contracts:
  `docs/codex-session-isolation-contract.md`,
  `docs/claude-session-isolation-contract.md`,
  `docs/gemini-session-isolation-contract.md`, and
  `docs/opencode-completion-contract.md`

## Contracts

- Startup and supervision: `docs/ccbd-startup-supervision-contract.md`
- Lifecycle: `docs/ccbd-lifecycle-stability-plan.md`
- Diagnostics: `docs/ccbd-diagnostics-contract.md`
- Config layout: `docs/ccb-config-layout-contract.md`
- WSL compatibility: `docs/ccb-wsl-compatibility-plan.md`
- Pane recovery: `docs/ccbd-pane-recovery-continuous-attach-plan.md`
- Provider state and managed-home storage:
  `docs/ccb-provider-state-storage-boundary-plan.md`
- Codex plugin projection: `docs/codex-plugin-projection-plan.md`

## Test Routing

Start with `rg -n "<feature_or_command>" test`. Common suites:

- Restart: `test/test_ccb_restart.py`
- Role Packs: `test/test_rolepacks.py`
- Config loader and validate: `test/test_v2_config_loader.py`,
  `test/test_v2_phase2_entrypoint.py`
- Dispatcher/message/mailbox/ask: search `test/` for `trace`, `queue`,
  `inbox`, `repair`, `chain`, `callback`, or `message_bureau`.
- Provider completion/session/storage: search by provider name under `test/`.
- Project command approval: `test/test_project_command_trust.py` and
  `test/test_project_command_approval_cli.py`.
- Mobile/Relay: search `test/` for `mobile_host`, `relay`, `pairing`,
  `provider_settings`, and `terminal`.
- Native Windows: search `test/` for `herdr`, `windows`, `registry`, and
  `endpoint_marker`.
