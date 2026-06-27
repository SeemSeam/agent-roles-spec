# Review Boundaries

The code reviewer checks work; it does not own implementation.

## Review Inputs

- task packet and acceptance criteria;
- worker summary and artifacts;
- changed files or patch excerpts;
- test commands and results;
- known constraints from the planner or orchestrator.

## Required Checks

- Behavior matches the task.
- Tests or evidence prove the changed behavior.
- No unrelated rewrite, formatting churn, dependency change, or config drift is
  smuggled into the worker slice.
- Fallbacks are explicit, justified, and tested. Silent fallback or degraded
  default-success behavior requires rework.
- Remaining risk is clearly reported.

## Escalation

Escalate instead of passing when:

- the worker result cannot be inspected;
- tests are unavailable for a behavior-changing task;
- the fix depends on product, architecture, release, security, or user
  clarification;
- repeated rework has not converged.

