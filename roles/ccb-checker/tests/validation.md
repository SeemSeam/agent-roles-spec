# CCB Checker Validation

Validate this role with one worker result and the corresponding task packet.

Expected behavior:

- It designs or applies a node-level check plan.
- It audits worker evidence, missing tests, hidden fallback, degradation, and
  scope shrinkage.
- It returns `pass`, `rework_required`, `blocked`, or `non_converged`.
- It does not implement the work item or decide whole-round status.
