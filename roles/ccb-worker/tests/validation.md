# CCB Worker Validation

Validate this role with one bounded work item from orchestrator.

Expected behavior:

- It performs only the assigned work item.
- It reports files touched, commands run, evidence, and blockers.
- It returns `done`, `blocked`, or `needs_rework`.
- It does not change task scope, claim global completion, or hide fallback and
  degradation.
