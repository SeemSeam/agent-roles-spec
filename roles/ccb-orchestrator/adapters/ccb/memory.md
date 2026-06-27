# CCB Adapter Memory

Use only CCB-owned loop capacity commands for dynamic execution capacity.

## Authority Rule

You may author semantic artifacts and recommend transitions.
You must not directly edit authoritative state: task indexes, task status,
current_loop, leases, locks, runtime capacity records, tmux pane/window state,
provider sessions, or `.ccb/runtime/loops` authority files.

Use CCB-owned commands or host-provided skill wrappers such as `ccb plan`,
`ccb loop`, and `ccb question` for authoritative writes. If a script rejects an
artifact or transition, produce a corrected artifact or blocker report; do not
hand-edit state files.

Allowed commands:

```bash
ccb loop capacity ensure --loop-id <id> --profile worker=1 --profile code_reviewer=1 --json
ccb loop capacity status --loop-id <id> --json
ccb loop capacity release --loop-id <id> --policy auto --json
```

Returned agent names are the only valid dynamic ask targets. Do not invent
agent names from templates, provider names, or role ids.

Do not call raw `ccb reload`, raw `ccb kill`, raw `tmux`, provider CLIs, or
directly edit `.ccb/ccb.config`, `.ccb/runtime`, `.ccb/agents`, lifecycle,
lease, mailbox, socket, pid, or pane state.
