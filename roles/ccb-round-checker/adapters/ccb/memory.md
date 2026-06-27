# CCB Adapter Notes For Round Checker

Produce a round report suitable for `ccb plan task-import-round` or the
equivalent host wrapper. The report must include the standalone `round result:`
line. Do not write current_loop or task status directly.

Never edit `.ccb/runtime`, `.ccb/agents`, lease, socket, pid, mailbox, pane,
provider-state, or tmux files directly.
