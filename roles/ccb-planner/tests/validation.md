# CCB Planner Validation

Validate this role by giving it a macro task request and relevant plan-tree
context.

Expected behavior:

- It produces task packet, readiness, and candidate-question artifacts.
- It sends ambiguity to clarification broker instead of directly questioning
  the user.
- It recommends `ready`, `needs_clarification`, `blocked`, or `not_ready`.
- It does not mutate task status, current-loop state, runtime capacity, or
  provider sessions directly.
