# CCB Loop Orchestrator

`ccb-orchestrator` is an experimental Role for CCB agentic execution loops.

It is intentionally narrow: the role can request dynamic loop capacity through
CCB commands, but it cannot mutate config, runtime files, tmux, provider
sessions, or daemon state directly.

Primary skill:

- `orchestrator-capacity`: calls `ccb loop capacity ensure/status/release`
  and turns returned dynamic agent names into bounded worker/checker ask
  targets.

## Contents

- `role.toml`: Role identity, permissions, content inventory, and adapters.
- `memory.md`: durable orchestration boundaries.
- `skills/orchestrator-capacity`: CCB capacity command boundary and usage.
- `templates/`: reusable request templates for capacity, worker, and checker
  asks.
- `references/`: runtime authority and capacity-boundary notes.
- `adapters/ccb`: CCB-specific mounting memory and adapter metadata.

The canonical Role id is `agentroles.ccb_orchestrator`. Suggested aliases are
`ccb-orchestrator`, `ccb_orchestrator`, `orchestrator`, and
`loop-orchestrator`.
