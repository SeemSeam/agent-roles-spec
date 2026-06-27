# CCB Plan Reviewer Validation

Validate this role with planner task-packet, readiness, acceptance, and
verification artifacts.

Expected behavior:

- It produces a review artifact with `approve`, `needs_revision`,
  `needs_clarification`, or `blocked`.
- It rejects vague scope, weak acceptance criteria, missing verification, and
  hidden assumptions.
- It identifies clarifications that should return to broker/frontdesk.
- It does not implement work or mutate task state directly.
