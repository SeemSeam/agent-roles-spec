---
name: repo-style-following
description: "Follow existing repository style, commands, naming, file layout, test patterns, dependency conventions, and code shape. Use when implementing in an unfamiliar repo or module."
---

# Repo Style Following

Use this skill when local conventions are unclear.

Read `templates/code-style-contract.md` when a concise style contract helps the
task.

## Workflow

1. Read active `AGENTS.md` or equivalent instructions.
2. Inspect nearby code for naming, file layout, imports, errors, tests, and
   dependency patterns.
3. Inspect project files for package manager, formatter, lint, typecheck, and
   test commands.
4. Match the repo's existing level of abstraction.
5. Prefer local utilities over new packages or new generic helpers.
6. If repo conventions conflict with a general best practice, follow the repo
   unless the conflict is unsafe; surface the conflict.

## Guardrails

- Do not introduce a new style because it is personally preferred.
- Do not reformat untouched files.
- Do not change package manager or tooling conventions.
- Do not add a dependency without `safe-dependency-change`.

## Output

```text
Repo Style
- instructions:
- pattern followed:
- commands:
- conflicts:
```
