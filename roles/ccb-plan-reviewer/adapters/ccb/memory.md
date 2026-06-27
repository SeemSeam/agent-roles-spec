# CCB Adapter Notes For Plan Reviewer

Prefer a single review artifact that can be imported by `ccb plan task-artifact`
or passed back to planner. Do not mutate task state directly.

Never edit `.ccb/runtime`, `.ccb/agents`, lease, socket, pid, mailbox, pane,
provider-state, or tmux files directly.
