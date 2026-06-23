---
name: safe-dependency-change
description: "Gate dependency additions, removals, upgrades, and lockfile changes. Use before changing dependencies, package managers, SDKs, generated lockfiles, or install commands."
---

# Safe Dependency Change

Use this skill before changing dependencies or package-management state.

Read `templates/dependency-change-gate.md` before editing dependency manifests
or lockfiles.

## Workflow

1. Confirm the task requires a dependency change.
2. Search for existing dependencies, platform APIs, or small local
   implementation alternatives.
3. Identify whether the change is runtime, dev-only, tooling, or lockfile-only.
4. Check license, maintenance, security, bundle/runtime impact, and platform
   compatibility when relevant.
5. Ask for explicit approval before making the dependency change unless the
   user already approved it in the current request.
6. Use the repository's existing package manager and lockfile convention.
7. Run relevant install, build, test, and lockfile checks.

## Guardrails

- Do not change package managers.
- Do not install global tools silently.
- Do not update broad dependency ranges to fix one issue unless necessary.
- Do not commit generated caches, downloaded packages, credentials, or runtime
  state.

## Output

```text
Dependency Gate
- need:
- alternative:
- package change:
- approval:
- verification:
```
