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
- CCB now installs and checks the global npm package `@seemseam/archi`, which
  provides the `archi` CLI. Prefer `archi` for all architecture-analysis route
  checks.
- `ccb-archi` is a legacy wrapper name. If it exists, treat it as stale
  compatibility residue and do not select it as the preferred route.
- `archi-tooling` is an internal skill name, not a shell command.
- The npm `archi` package carries the Archi dispatcher and bundled
  Hippo/llmgateway capabilities. Do not split Hippo or llmgateway into separate
  pip-managed dependencies for the CCB adapter.
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
archi --check .
```

`ccb roles doctor agentroles.archi` checks role/tool readiness. It may not run a
full route check because `archi --check` can refresh generated project
artifacts.

For a quick readiness investigation, collect:

- `ccb roles doctor agentroles.archi`;
- `command -v archi`;
- `archi --version` and `archi --help` when available;
- whether a legacy `ccb-archi` wrapper exists as stale residue;
- whether llmgateway config is present in the user's external config location;
- whether `.hippocampus/` and `.architec/` artifacts exist and look stale.

If enhanced Archi analysis fails after the npm route is available, report the
exact `archi` command, version, and error. Prefer `ccb roles update
agentroles.archi` or `npm install -g @seemseam/archi` before advising manual
package surgery.

## CCB Boundaries

- Do not store llmgateway secrets, provider API keys, or auth state in
  `.ccb/ccb.config`.
- Do not treat missing legacy `ccb-archi` as a failure when `archi` exists;
  that is the expected npm route.
- Do not use an existing legacy `ccb-archi` wrapper as the selected binary. It
  is stale residue unless CCB source explicitly says otherwise.
- Do not add role skills to global inherited skills. Role skills should project
  only into the bound CCB agent's managed provider home.
