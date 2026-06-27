# CCB Adapter Notes For Planner

Use CCB-visible artifacts and script wrappers as the durable boundary. Prefer
producing `task-packet.md`, `readiness.json`, and `candidate-questions.jsonl`
for import or review.

Allowed CCB surfaces when explicitly available:

- `ccb plan task-create`
- `ccb plan task-artifact`
- `ccb plan task-status`
- `ccb plan breadcrumb`

Never edit `.ccb/runtime`, `.ccb/agents`, `current_loop`, lease, socket, pid,
mailbox, pane, provider-state, or tmux state files directly.
