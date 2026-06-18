# CCB Adapter Notes

CCB may consume this Role through a CCB adapter.

CCB's role store, provider-state projection, reload behavior, ask routing, and
sidebar display remain CCB-owned implementation details.

## Adapter Assets

- `adapter.toml`: CCB mapping metadata.
- `memory.md`: CCB-specific role memory appended by the CCB adapter.
- `skills/`: CCB-specific generic skills that supplement the core Role skills.
- `tools/`: optional CCB tool hooks for installing, updating, and diagnosing
  the npm `@seemseam/archi` / `archi` CLI evidence route.

CCB should convert the Role source into provider-native assets at projection
time. The core Role does not need Codex-specific or Claude-specific skill
directories.

## Project Binding Boundary

CCB-specific project configuration, such as the bound agent name, workspace
mode, approved permissions, project scope, and provider selection, belongs in
CCB project configuration or CCB-owned runtime state rather than the core Role
source.

The `archi` CLI route is useful but optional. If it is unavailable, the Role
should continue architecture review from direct source inspection, project
docs, tests, and other configured evidence instead of failing the review.

Generated provider-state assets are projection output. They should be traceable
to the mounted Role and removable by CCB unmount or cleanup behavior, but they
must not be written back into this Role source directory.
