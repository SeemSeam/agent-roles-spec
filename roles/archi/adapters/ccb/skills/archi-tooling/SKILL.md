---
name: archi-tooling
description: Manage and diagnose the CCB adapter's Architec, Hippo, llmgateway, ccb-archi, and role tool readiness.
---

# Archi Tooling

Use this skill for the CCB adapter's architecture-analysis toolchain, not for
architecture review itself.

`archi-tooling` is an internal skill name, not a shell command. The shell
commands are `ccb roles ...`, `ccb-archi`, and `archi`.

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
ccb-archi --check . || archi --check .
```

Inspect command shape before assuming flags:

```bash
ccb-archi --help || archi --help
```

## Diagnostics

Report:

- whether `ccb-archi` or `archi` exists;
- Python version and venv path when CCB-managed;
- whether llmgateway config is detected;
- whether `archi --check .` succeeds when a route check is requested;
- when the CCB-managed `ccb-archi` wrapper is missing and the role is falling
  back to a user/global `archi` binary.
- whether `.hippocampus/` and `.architec/` artifacts exist and appear stale;
- whether an enhanced-analysis failure looks like a Python dependency issue,
  such as a missing package in the managed Architec venv.

Do not print API keys or llmgateway secret values.

## Interpretation

- `agentroles.archi` is the canonical Role id; `ccb.archi` is a legacy CCB input
  alias.
- `archi-tooling` is a projected skill, not an executable command.
- `ccb-archi` is the preferred managed wrapper. A global `archi` fallback is
  degraded unless the user explicitly wants global tooling.
- Hippo/Hippocampus artifacts are generated structural evidence. Do not edit
  them by hand.
- llmgateway config is external user configuration. Missing config degrades
  LLM-enhanced Architec evidence, but it does not prevent direct architecture
  review.
- When managed dependencies are missing, prefer `ccb roles update
  agentroles.archi` before manual package edits.
