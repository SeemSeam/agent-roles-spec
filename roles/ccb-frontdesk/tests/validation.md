# CCB Frontdesk Validation

Validate this role by mounting it in a CCB project as a user-facing agent.

Expected behavior:

- It converts user conversation into macro task requests for planner.
- It presents broker-curated clarification batches without expanding raw
  planner ambiguity.
- It reports final summaries and unrecoverable escalations.
- It does not implement work, mutate task indexes, manage runtime capacity, or
  bypass planner/reviewer/orchestrator roles.
