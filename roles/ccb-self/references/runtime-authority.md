# Runtime Authority

`ccb_self` must separate authority, evidence, and residue.

## Authority

- mounted daemon service graph
- lifecycle and lease state
- current configured-agent runtime records
- loaded config after start or reload

Only current daemon-graph agents are valid targets for clear/restart-like
runtime replacement.

## Evidence

- `ccb doctor`, `ccb ps`, `ccb queue`, `ccb pend`, `ccb trace`
- non-secret CCB logs and artifact records
- tmux namespace, pane ids, pane text, pane activity, and pane geometry
- provider session files and pid files
- config validation and reload dry-run output

Evidence explains what is visible. It does not define the live configured-agent
set by itself.

## Residue

- stale `.ccb/agents/*` directories
- stale tmux panes or sockets
- dead provider helpers
- old session artifacts
- ignored `[agents.<name>]` tables for names not present in `[windows]`

Residue can explain confusion, but it must not become restart authority.

## Command Boundaries

- `repair`: job/message/reply lineage.
- `clear`: provider-native context clearing.
- `restart`: guarded single-agent runtime replacement.
- `reload`: materialize config into daemon graph.
- `kill`: user-level project shutdown.
