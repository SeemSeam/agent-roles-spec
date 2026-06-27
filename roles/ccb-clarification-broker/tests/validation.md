# CCB Clarification Broker Validation

Validate this role with planner candidate questions and optional user answers.

Expected behavior:

- It merges duplicate candidate questions.
- It removes already-answerable or obsolete questions.
- It produces a compact frontdesk-facing user question batch.
- It records defaults and deferrals when safe.
- It normalizes user answers back into planner-facing answer artifacts.
- It does not directly converse with the user or activate execution.
