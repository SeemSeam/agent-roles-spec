---
name: ci-failure-fix
description: "Fix failing tests or CI by reading logs, identifying the smallest failing surface, making a minimal change, and rerunning targeted verification. Use when given CI logs, failing commands, or broken checks."
---

# CI Failure Fix

Use this skill when the user asks to fix failing tests, lint, typecheck, build,
or CI.

## Workflow

1. Capture the exact failing command, job, or log snippet.
2. Identify whether the failure is deterministic, flaky, environment-specific,
   or external-provider-specific.
3. Reproduce locally when feasible with the narrowest command.
4. Make the smallest fix that targets the failure.
5. Rerun the failing command.
6. Broaden verification if the fix touches shared code.
7. Report the failure, fix, command, and residual CI-only risks.

## Guardrails

- Do not rewrite code broadly to satisfy a narrow failure.
- Do not weaken tests, type checks, lint rules, or CI gates without approval.
- Do not treat external providers as local proof if logs are unavailable.
- Do not chase unrelated warnings unless they block the requested check.

## Output

```text
CI Fix
- failing check:
- root cause:
- change:
- rerun:
- remaining risk:
```
