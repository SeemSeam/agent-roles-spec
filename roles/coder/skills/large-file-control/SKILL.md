---
name: large-file-control
description: "Prevent large-file growth and mixed-responsibility edits. Use when adding significant logic to a large file, mixed-purpose module, or file with repeated conditionals."
---

# Large File Control

Use this skill before adding meaningful logic to a file that is already hard to
scan or carries multiple responsibilities.

Read `templates/large-file-control.md` before deciding whether to inline or
extract.

## Workflow

1. Check file size, responsibilities, repeated conditionals, and test surface.
2. Identify whether the new behavior has a focused domain concept.
3. Prefer extraction only when it improves current locality, readability, or
   testability.
4. Keep code inline when extraction would only add indirection.
5. Avoid dumping logic into vague `utils`, `helpers`, `manager`, or `service`
   files.
6. Report the decision and rationale.

## Guardrails

- Do not split mechanically by line count.
- Do not add a new abstraction for one caller unless it hides real complexity.
- Do not continue growing a file if the new code requires edits in many
  distant sections.
- If the right split is architectural, escalate to `archi`.

## Output

```text
Large File Decision
- file:
- signal:
- decision: inline/extract/defer/escalate
- rationale:
- verification:
```
