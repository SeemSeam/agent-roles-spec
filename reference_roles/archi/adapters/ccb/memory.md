# CCB Adapter Memory

This adapter projects `agentroles.archi` into a CCB-managed agent.

## CCB Toolchain

- CCB installs Role assets into its role store and binds a project-local agent
  through `.ccb/ccb.config`.
- The visible CCB target should be the project-local agent name, usually
  `archi`; the stable Role id is `agentroles.archi`.
- CCB may install a managed Architec wrapper named `ccb-archi` in a CCB-owned
  tool root. Prefer `ccb-archi` when it exists; fall back to `archi` only after
  reporting that the managed wrapper is unavailable.
- `archi-tooling` is an internal skill name, not a shell command.

## CCB Commands

Use:

```bash
ccb roles install agentroles.archi
ccb roles update agentroles.archi
ccb roles doctor agentroles.archi
ccb-archi --check . || archi --check .
```

`ccb roles doctor agentroles.archi` checks role/tool readiness. It may not run a
full route check because `archi --check` can refresh generated project
artifacts.

## CCB Boundaries

- Do not store llmgateway secrets, provider API keys, or auth state in
  `.ccb/ccb.config`.
- Do not treat missing `ccb-archi` as proof that a global `archi` route is
  ready.
- When `ccb-archi` is missing but `archi` exists, report degraded fallback
  status.
