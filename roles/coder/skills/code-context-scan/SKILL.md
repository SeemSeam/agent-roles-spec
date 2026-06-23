---
name: code-context-scan
description: "Scan relevant source, tests, commands, and existing project patterns before editing code. Use before non-trivial implementation, bug fixing, or refactoring when the right local pattern is unclear."
---

# Code Context Scan

Use this skill before writing code when the task is more than a tiny
self-contained edit.

Read `templates/implementation-brief.md` when the implementation scope or
verification needs to be made explicit.

## Workflow

1. Identify the requested behavior and likely owned area.
2. Inspect nearby source files before editing.
3. Inspect tests for the same feature, module, helper, or command.
4. Find project commands from `AGENTS.md`, package files, Makefiles, CI config,
   or existing test docs.
5. Search for existing helpers, components, types, fixtures, validators, and
   error handling patterns before creating new ones.
6. State the implementation brief:
   - goal;
   - scope;
   - out of scope;
   - existing pattern to follow;
   - verification command.

## Guardrails

- Do not scan the entire repository when a focused search is enough.
- Do not start editing before you understand at least one nearby pattern.
- Do not invent commands when the repo already documents them.
- If the task appears to need architecture, review, frontend, mobile, security,
  or release ownership, surface that before writing.

## Output

```text
Context Scan
- goal:
- relevant files:
- existing pattern:
- tests:
- command:
- scope boundary:
```
