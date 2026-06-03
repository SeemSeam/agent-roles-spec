# CCB Adapter Memory

This adapter projects `agentroles.archi` into a CCB-managed agent.

## CCB Toolchain

- CCB installs Role assets into its role store and binds a project-local agent
  through `.ccb/ccb.config`.
- The visible CCB target should be the project-local agent name, usually
  `archi`; the stable Role id is `agentroles.archi`.
- `ccb.archi` is only a legacy input alias. Prefer `agentroles.archi` in new
  commands and explain that CCB normalizes the old alias to the canonical Role
  id.
- CCB may install a managed Architec wrapper named `ccb-archi` in a CCB-owned
  tool root. Prefer `ccb-archi` when it exists; fall back to `archi` only after
  reporting that the managed wrapper is unavailable.
- `archi-tooling` is an internal skill name, not a shell command.
- CCB-managed Architec tooling normally lives under the CCB data/tool root,
  with a virtual environment, a stable wrapper, and a user bin link. Do not
  require a global `pip install --user` when the managed wrapper exists.
- llmgateway configuration remains outside CCB project config. Check only
  whether a config exists; never display secret values.
- Hippo and Architec artifacts inside the project are generated evidence. Do
  not edit `.hippocampus/` or `.architec/` by hand.

## CCB Commands

Use:

```bash
ccb roles install agentroles.archi
ccb roles update agentroles.archi
ccb roles doctor agentroles.archi
ccb roles add agentroles.archi:codex
ccb-archi --check . || archi --check .
```

`ccb roles doctor agentroles.archi` checks role/tool readiness. It may not run a
full route check because `archi --check` can refresh generated project
artifacts.

For a quick readiness investigation, collect:

- `ccb roles doctor agentroles.archi`;
- `command -v ccb-archi` and `command -v archi`;
- `ccb-archi --version` or `archi --version` when available;
- whether llmgateway config is present in the user's external config location;
- whether `.hippocampus/` and `.architec/` artifacts exist and look stale.

If enhanced Architec analysis fails because a Python package such as `h2` is
missing, report it as a managed-tool dependency issue and prefer
`ccb roles update agentroles.archi` before advising manual package surgery.

## CCB Boundaries

- Do not store llmgateway secrets, provider API keys, or auth state in
  `.ccb/ccb.config`.
- Do not treat missing `ccb-archi` as proof that a global `archi` route is
  ready.
- When `ccb-archi` is missing but `archi` exists, report degraded fallback
  status.
- Do not add role skills to global inherited skills. Role skills should project
  only into the bound CCB agent's managed provider home.
