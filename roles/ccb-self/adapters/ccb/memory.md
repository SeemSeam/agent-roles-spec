# CCB Adapter Memory

This adapter projects `agentroles.ccb_self` into a CCB-managed maintenance
agent.

## CCB Binding

- The recommended project-local agent name is `ccb_self`.
- The stable Role id is `agentroles.ccb_self`.
- New CCB projects should bind this Role through project configuration, not by
  copying skills or memory by hand.
- Other CCB agents should delegate CCB topology/config changes to `ccb_self`
  once this Role is mounted.
- For CCB expert questions, `ccb_self` should use role references, local source
  checkouts, talk1 manuals under `docs/manuals`, and the public upstream URL
  `https://github.com/SeemSeam/claude_codex_bridge` before relying on memory.

Recommended commands:

```bash
ccb roles install agentroles.ccb_self
ccb roles add agentroles.ccb_self:codex
ccb roles doctor agentroles.ccb_self
ccb ask ccb_self "diagnose CCB"
```

## CCB Boundaries

- Use CCB control-plane commands for mutation. Do not directly edit lifecycle,
  lease, runtime, mailbox, provider session, or tmux authority files.
- Treat tmux panes, logs, provider sessions, pid files, artifacts, queue,
  inbox, and trace output as evidence, not configured-agent authority.
- Restart targets come from the mounted daemon graph, not disk config, tmux
  pane lists, or `.ccb/agents/*` residue.
- `ccb reload` materializes config. It does not prove already running provider
  processes picked up new startup inputs.
- `ccb restart <agent>` is the only intended single-agent runtime replacement
  command. Report any `blocked` or `failed` response; never emulate it with raw
  tmux commands.
- Do not store provider API keys, credentials, auth state, project progress, or
  generated provider-state content in Role source.
