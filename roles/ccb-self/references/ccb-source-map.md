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

## CLI Services

- Ask submission: `lib/cli/services/ask.py`
- Ask runtime submission: `lib/cli/services/ask_runtime/submission.py`
- Queue/inbox/pend/watch/trace/ack services:
  `lib/cli/services/queue.py`, `lib/cli/services/inbox.py`,
  `lib/cli/services/pend.py`, `lib/cli/services/watch.py`,
  `lib/cli/services/trace.py`, and `lib/cli/services/ack.py`
- Config validate: `lib/cli/services/config_validate.py`
- Restart service: `lib/cli/services/restart.py`
- Role commands: `lib/cli/roles_runtime/commands.py`

## Daemon And Dispatcher

- Socket client endpoints: `lib/ccbd/socket_client_runtime/endpoints.py`
- Submit, watch, queue, inbox, ack, trace handlers:
  `lib/ccbd/handlers/`
- Single-agent restart handler: `lib/ccbd/handlers/project_restart.py`
- Dispatcher facade and state: `lib/ccbd/services/dispatcher_runtime/`
- Job start, polling, finalization, callbacks:
  `lib/ccbd/services/dispatcher_runtime/lifecycle_start_runtime/`,
  `lib/ccbd/services/dispatcher_runtime/polling_service.py`,
  `lib/ccbd/services/dispatcher_runtime/finalization_runtime/`, and
  `lib/ccbd/services/dispatcher_runtime/callbacks.py`

## Message Bureau And Mailbox

- Models: `lib/message_bureau/models.py`
- Facade and stores: `lib/message_bureau/facade.py`,
  `lib/message_bureau/store.py`
- Submission, terminal attempts, terminal replies:
  `lib/message_bureau/facade_recording_submission.py`,
  `lib/message_bureau/facade_recording_terminal_attempts.py`,
  `lib/message_bureau/facade_recording_terminal_replies.py`
- Callback edges and control queue:
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

## Provider Runtime

- Provider backends: `lib/provider_backends/`
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

## Test Routing

Start with `rg -n "<feature_or_command>" test`. Common suites:

- Restart: `test/test_ccb_restart.py`
- Role Packs: `test/test_rolepacks.py`
- Config loader and validate: `test/test_v2_config_loader.py`,
  `test/test_v2_phase2_entrypoint.py`
- Dispatcher/message/mailbox/ask: search `test/` for `trace`, `queue`,
  `inbox`, `repair`, `callback`, or `message_bureau`.
- Provider completion/session/storage: search by provider name under `test/`.
