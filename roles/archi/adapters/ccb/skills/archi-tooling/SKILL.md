---
name: archi-tooling
description: Manage and diagnose the CCB adapter's npm Archi CLI, bundled Hippo/llmgateway capabilities, and role tool readiness.
---

# Archi Tooling

Use this skill for the CCB adapter's architecture-analysis toolchain, not for
architecture review itself.

`archi-tooling` is an internal skill name, not a shell command. The shell
commands are `ccb roles ...` and `archi`.

## Commands

Check role and tool readiness:

```bash
ccb roles doctor agentroles.archi
```

Install or update Role assets and declared tools:

```bash
ccb roles install agentroles.archi
ccb roles update agentroles.archi
```

Check the local Architec route:

```bash
archi --check .
```

Inspect command shape before assuming flags:

```bash
archi --help
```

## Diagnostics

Report:

- whether `archi` exists and which binary path is selected;
- `archi --version` output when available;
- whether a legacy `ccb-archi` wrapper exists as stale residue;
- whether llmgateway config is detected;
- whether `archi --check .` succeeds when a route check is requested;
- whether `.hippocampus/` and `.architec/` artifacts exist and appear stale;
- whether enhanced-analysis failure is a config/readiness issue or an npm
  package/binary issue.

Do not print API keys or llmgateway secret values.

## Interpretation

- `agentroles.archi` is the canonical Role id; `ccb.archi` is a legacy CCB input
  alias.
- `archi-tooling` is a projected skill, not an executable command.
- `archi` from npm `@seemseam/archi` is the preferred CCB adapter route.
- `ccb-archi` is a legacy wrapper name. Its presence should be reported as
  stale residue, not used as the preferred route.
- Hippo/Hippocampus artifacts are generated structural evidence. Do not edit
  them by hand.
- llmgateway config is external user configuration. Missing config degrades
  LLM-enhanced Architec evidence, but it does not prevent direct architecture
  review.
- When the npm package or binary is missing, prefer `ccb roles update
  agentroles.archi` or `npm install -g @seemseam/archi` before manual package
  edits.
