# CCB Adapter Notes

CCB may mount this Role as the `ccb_self` maintenance agent.

CCB's role store, provider-state materialization, reload behavior, ask routing,
sidebar display, tmux namespace, daemon lifecycle, and cleanup behavior remain
CCB-owned implementation details.

## Adapter Assets

- `adapter.toml`: CCB mapping metadata.
- `memory.md`: CCB-specific role memory appended by the CCB adapter.
- `tools/doctor.py`: read-only JSON helper for CCB control-plane diagnostics.

CCB should convert the Role source into provider-native assets at mount or
materialization time. The core Role does not need Codex-specific or
Claude-specific skill directories.

## Project Binding Boundary

The bound agent name, workspace mode, approved permissions, project scope,
provider selection, and team topology belong in `.ccb/ccb.config` or other
CCB-owned project binding state.

Generated provider-state assets are mount/materialization output. They should be
traceable to the mounted Role and removable by CCB unmount or cleanup behavior,
but they must not be written back into this Role source directory.

## Source Ownership Requirements

- The full `ccb-config` skill lives under this Role source at
  `skills/ccb-config`.
- Common inherited skill folders must not contain or install the full
  `ccb-config` skill.
- CCB may copy the Role-owned skills only into the bound `ccb_self` instance
  during mount/materialization.
- If a non-self CCB agent sees a CCB config task, it should delegate to
  `ccb_self` or ask the user to route the request there.
- Adapter materialization must preserve the role source boundary: no runtime
  state, pid files, sockets, provider sessions, traces, or task progress are
  written to this directory.
