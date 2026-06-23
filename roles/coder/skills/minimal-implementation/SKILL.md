---
name: minimal-implementation
description: "Implement the smallest safe repo-native code change for the requested behavior. Use for feature work, small refactors, and multi-file implementation tasks."
---

# Minimal Implementation

Use this skill when writing code after the context is understood.

Read `templates/change-slice.md` for multi-step work and
`templates/code-style-contract.md` when the local coding style needs to be made
explicit.

## Workflow

1. Confirm the smallest behavior that must change.
2. Choose one slice that can be implemented and verified independently.
3. Touch only files required for that slice.
4. Prefer direct, readable code over generalized abstractions.
5. Reuse existing helpers and patterns.
6. Keep the project buildable after the slice.
7. Verify with the narrowest useful command.
8. Continue to the next slice only after the current slice is green.

## Guardrails

- Do not do unrelated cleanup.
- Do not modernize adjacent code.
- Do not reorganize imports or format untouched files unless the formatter is
  part of the targeted verification.
- Do not add new dependencies, migrations, CI changes, or broad rewrites
  without explicit approval.
- Do not implement future requirements that are not in scope.

## Output

```text
Implementation Slice
- changed behavior:
- files touched:
- verification:
- next slice or done:
```
