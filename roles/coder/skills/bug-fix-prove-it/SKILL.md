---
name: bug-fix-prove-it
description: "Fix bugs by reproducing the failure first, making the smallest correction, and proving the regression is covered. Use for bug reports, failing tests, and regressions."
---

# Bug Fix Prove-It

Use this skill when the user reports a bug or asks you to fix a failing test.

Read `templates/test-proof.md` for the final evidence report.

## Workflow

1. Restate the bug in observable terms.
2. Reproduce the failure with an existing command, manual steps, or a new test.
3. If reproduction is not possible, explain the proof gap before changing code.
4. Make the smallest fix that addresses the root cause.
5. Run the failing reproduction again and confirm it passes.
6. Run nearby regression checks when shared code was touched.
7. Report the before/after evidence.

## Guardrails

- Do not fix from intuition when a cheap reproduction is available.
- Do not broaden behavior just to make the bug disappear.
- Do not hide the bug with a fallback, catch-all, or default-success response.
- Do not change tests to match incorrect behavior.

## Output

```text
Bug Fix Proof
- bug:
- reproduced with:
- fix:
- verified with:
- residual risk:
```
