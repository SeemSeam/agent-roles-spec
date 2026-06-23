---
name: source-check-before-api-use
description: "Check current official documentation before writing framework, library, CLI, or API code where version-specific correctness matters. Use when APIs are unfamiliar, recently changed, or user asks for current best practice."
---

# Source Check Before API Use

Use this skill when correctness depends on current external API behavior.

This skill is intentionally selective. Do not slow down ordinary local edits by
fetching docs when the change is pure project logic and version-independent.

## Workflow

1. Detect the library, framework, CLI, or API and its project version from
   dependency files or local config.
2. Prefer official docs, official changelogs, or standards references.
3. Fetch only the relevant page or section.
4. Compare docs with existing project patterns.
5. If docs and project style conflict, surface the conflict before changing
   code when the choice affects behavior or maintenance.
6. Implement the documented pattern or clearly mark unverified behavior.
7. Cite the docs in the final answer when they materially affected the code.

## Guardrails

- Do not cite sources you did not inspect.
- Do not use blog posts or tutorials as primary authority when official docs
  exist.
- Do not add comments with long external quotes.
- Do not change a project-wide pattern just because newer docs prefer another
  one unless the task asks for migration.

## Output

```text
Source Check
- package/version:
- source:
- pattern:
- conflict:
- applied:
```
