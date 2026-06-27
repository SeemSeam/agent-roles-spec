# CCB Round Checker Validation

Validate this role with planner verification contract, orchestrator summary,
worker reports, and checker reports.

Expected behavior:

- It produces a round result artifact with `pass`, `rework_node`, `partial`,
  `replan_required`, or `global_blocker`.
- It audits integrated behavior, hidden fallback, degradation, and partial
  success claims.
- It does not fix code, change product scope, or route the next loop directly.
