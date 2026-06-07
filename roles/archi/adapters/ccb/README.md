# CCB Adapter Notes

CCB may consume this Role through a CCB adapter.

CCB's role store, provider-state projection, reload behavior, ask routing, and
sidebar display remain CCB-owned implementation details.

## Adapter Assets

- `adapter.toml`: CCB mapping metadata.
- `memory.md`: CCB-specific role memory appended by the CCB adapter.
- `skills/`: CCB-specific generic skills that supplement the core Role skills.
- `tools/`: CCB tool hooks for installing, updating, and diagnosing the
  npm `@seemseam/archi` / `archi` CLI route.

CCB should convert the Role source into provider-native assets at projection
time. The core Role does not need Codex-specific or Claude-specific skill
directories.
