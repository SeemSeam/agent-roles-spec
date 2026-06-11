# CCB Command Surface

Use this reference for command usage and source lookup. Confirm exact current
syntax from source or `ccb <command> --help` when precision matters.

## Runtime Commands

Parsed in `lib/cli/parser_runtime/commands.py`:

- `ask`
- `cancel <job_id>`
- `clear [agent_names...]`
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
- `maintenance [status|tick|schedule|enable|disable]`
- `doctor [ps|logs <agent_name>|storage]`
- `config validate`
- `fault list|arm|clear`
- `reload [--dry-run]`
- `restart <agent_name>`

## Ask Flags

`ccb ask` supports route/content policy flags:

- `--compact`
- `--silence`
- `--callback`
- `--artifact-request`
- `--artifact-reply`
- `--artifact-io`

Nested CCB work should use `--callback` when the parent needs the child result,
or `--silence` for independent fire-and-forget work.

## Maintenance Meanings

- `repair`: job, message, reply, artifact, callback, and ack lineage.
- `clear`: provider-native context clearing.
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

Tool commands are currently Neovim-oriented:

- `tools doctor neovim`
- `tools install neovim`
- `tools update neovim`

## Removed Command Guidance

Removed or migrated commands include `open`, `up`, `mail`, and `provider`.
Use current help/source for migration wording before advising a user.
