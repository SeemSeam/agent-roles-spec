# CCB Adapter Notes For Worker

Return evidence to orchestrator or checker. Do not call raw `ccb reload`,
`ccb kill`, `tmux`, or mutate runtime files.

Never edit `.ccb/runtime`, `.ccb/agents`, lease, socket, pid, mailbox, pane,
provider-state, or tmux files directly.
