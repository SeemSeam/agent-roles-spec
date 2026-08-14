---
name: review-code-quality
description: "Review a declared code change or code scope with evidence-backed findings and five independent quality scores. Use for pull requests, diffs, commits, patches, file sets, modules, bug fixes, refactors, and implementation-review requests."
---

# Review Code Quality

Inspect the declared review subject and produce a concise report using
`templates/review-report.md`.

## Workflow

1. Bind the review to the declared diff, commit, pull request, patch, file set,
   or module and identify its expected behavior.
2. Read enough surrounding code, tests, and repository conventions to judge
   the change in context.
3. Report only actionable findings. For each finding, give severity, location,
   observed problem, impact, and correction direction.
4. Mark an uncertain concern as a verification gap. Keep unrelated
   pre-existing debt separate from the scored change.
5. Score all five dimensions independently with integer values from 1 to 5.
6. Return the verdict. Do not edit the reviewed code.

## Five Scores

1. **Correctness**: expected behavior, edge cases, state changes, and error
   semantics.
2. **Simplicity and readability**: clear control flow, necessary complexity,
   duplication, dead code, and avoidable abstraction.
3. **Error handling and fallback integrity**: swallowed failures, false
   success, silent degradation, unjustified defaults, unbounded retries, and
   unobservable or untested fallback.
4. **Design and maintainability**: responsibility boundaries, coupling,
   change isolation, consistency with repository patterns, and future repair
   cost.
5. **Tests and risk control**: meaningful verification plus relevant security,
   data, performance, concurrency, compatibility, and operational risk.

Use the same scale for every dimension:

- `5`: reliable and clear; no substantive issue found.
- `4`: good; only minor improvement remains.
- `3`: acceptable; clear quality debt or verification gap remains.
- `2`: material problem; change is required.
- `1`: severe or systemic failure.

Do not deduct without evidence. Do not score code length by itself. Do not
penalize a fallback merely for existing; penalize it when it is implicit,
unbounded, contract-changing, unobservable, or untested. Avoid counting one
problem as several independent defects.

## Verdict

- `approve`: no required-change finding and all scores are 4 or 5.
- `approve_with_comments`: no critical or major finding, no score below 3,
  and at least one minor issue or score of 3.
- `changes_required`: any critical or major finding, or any score of 1 or 2.
- `blocked`: the review subject, expected behavior, or essential evidence is
  missing or cannot be inspected.

The total out of 25 is informational. Never let it override the verdict rules.
