---
name: test-backed-change
description: "Add or update behavior-focused tests for code changes and run appropriate verification. Use when behavior changes, logic is added, or existing behavior could regress."
---

# Test-Backed Change

Use this skill whenever implementation changes behavior.

Read `templates/test-proof.md` when reporting verification evidence.

## Workflow

1. Identify the behavior being changed.
2. Find the existing test style and test level for that behavior.
3. Add or update the smallest test that would fail if the behavior regressed.
4. Prefer public interfaces and observable behavior over implementation
   details.
5. Run the targeted test first.
6. Run broader tests when touched surface, shared code, or risk justifies it.
7. Report exact commands and results.

## Guardrails

- Do not add tests that only assert implementation details.
- Do not delete or weaken failing tests to make the suite pass.
- Do not claim behavior is verified when only typecheck or lint ran.
- If no test can be added reasonably, explain why and provide the strongest
  available alternative evidence.

## Output

```text
Test Proof
- behavior:
- test:
- command:
- result:
- remaining gap:
```
