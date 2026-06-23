---
name: fallback-discipline
description: "Control error handling, defaults, retries, compatibility paths, and fallback behavior. Use before adding catch blocks, defaults, shims, optional values, retries, or graceful degradation."
---

# Fallback Discipline

Use this skill whenever the implementation may hide, soften, retry, or default
around a failure.

Read `templates/fallback-discipline.md` before writing fallback code.

## Workflow

1. Identify the failure or unknown state.
2. Decide whether continuing is required by the requested behavior or existing
   product contract.
3. If continuing is not required, surface the failure explicitly.
4. If a fallback is required, make it narrow and observable.
5. Add or update a test for the fallback path.
6. Report how the failure is surfaced to callers, logs, UI, metrics, or tests.

## Forbidden By Default

- Empty catches.
- Catch-all exception handling around unrelated work.
- Returning empty values or success to hide failure.
- Silent retries.
- Unknown states treated as valid.
- Fake backward compatibility for callers that do not exist.
- Optional or broad types that erase invariants.

## Output

```text
Fallback Decision
- failure handled:
- continue or fail:
- surfacing:
- test:
- review needed:
```
