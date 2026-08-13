# CCB Command Surface

Use this reference for command usage and source lookup. Confirm exact current
syntax from source or `ccb <command> --help` when precision matters.

## Runtime Commands

Parsed in `lib/cli/parser_runtime/commands.py`:

- `ask`
- `cancel <job_id>`
- `followup <active_job_id> --message <correction>`
- `clear [agent_names...]`
- `compact [agent_names|all...]`
- `cleanup`
- `kill [-f|--force]`
- `ps`
- `ping <agent_name|all>`
- `watch <agent_name|job_id>`
- `pend [--watch|--inbox|--queue] [--detail] <target> [count]`
- `queue [--detail] <target>`
- `trace <submission_id|message_id|attempt_id|reply_id|job_id>`
- `resubmit <message_id>`
- `retry <job_id|attempt_id>`
- `repair <ack|retry|resubmit> ...`
- `wait-any`, `wait-all`, `wait-quorum`
- `inbox [--detail] <agent_name>`
- `ack <agent_name> [inbound_event_id]`
- `logs <agent_name>`
- `agent status|show|add|move|hide|park|resume|remove|release`
- `layout ...`
- `loop capacity|topology|run-once|runner`
- `plan task-create|task-artifact|task-status|task-bind-loop|task-import-round|task-show|task-list|breadcrumb`
- `question candidate-import|user-batch-import|answer-import|normalized-import|status`
- `frontdesk forward-planner`
- `maintenance [status|tick|schedule|enable|disable]`
- `mobile serve|devices|revoke`
- `relay invite issue|status|list|revoke`
- `relay host activate|status|list|revoke`
- `doctor [ps|logs <agent_name>|storage]`
- `config validate|effective|migrate|approve-commands|ui|import-herdr`
- `fault list|arm|clear`
- `reload [--dry-run]`
- `restart <agent_name>`

## Ask Flags

`ccb ask` supports route/content policy flags:

- `--compact`
- `--silence`
- `--chain`
- `--inline-request`
- `--artifact-request`
- `--artifact-reply`
- `--artifact-io`

Nested CCB work should use `--chain` only when the parent cannot finish without
the child result, or `--silence` for independent work whose result is not
needed. Submit once and stop unless diagnostics were requested.

`ccb followup <active_job_id> --message <correction>` targets one active
Provider turn. Only `injected` is success. `rejected`, `too_late`, or
`terminal` means the correction was not applied; cancel and resubmit the full
corrected request when still needed instead of queueing an ordinary ask.

## Maintenance Meanings

- `repair`: job, message, reply, artifact, chain, and ack lineage.
- `clear`: provider-native context clearing.
- `compact`: busy-gated, verified Provider-native context compaction.
- `reload`: materialize disk config into the daemon graph.
- `restart`: guarded single-agent runtime replacement from the current mounted
  daemon graph.
- `kill`: user-level project shutdown.

Do not substitute raw tmux mutation for any of these commands.

## Role And Tool Commands

Role commands are implemented under `lib/cli/roles_runtime/commands.py` and
`lib/rolepacks/`:

- `roles list`
- `roles show <role_id>`
- `roles install [role_id] [--path PATH] [--skip-tools]`
- `roles update [role_id] [--path PATH] [--skip-tools]`
- `roles sync [path] [--with-tools]`
- `roles doctor <role_id>`
- `roles add <role_spec> [--agent NAME] [--provider PROVIDER] [--window WINDOW]`

Current releases expose the managed rich workbench through `ccb rich` and
`ccb tools <doctor|install|update|enable|disable|launch|uninstall> workbench`.

## Project Command Approval

The project-local fields `tool_windows.<name>.command` and
`agents.<name>.provider_command_template` require exact external approval
before execution. Review and approve deliberately with:

```bash
ccb config approve-commands
```

Changed values require a new approval. `ccb -s`, noninteractive/script mode,
config validation, and project ownership do not bypass this gate.

## Removed Command Guidance

Removed or migrated commands include `open`, `up`, `mail`, and `provider`.
Use current help/source for migration wording before advising a user.
