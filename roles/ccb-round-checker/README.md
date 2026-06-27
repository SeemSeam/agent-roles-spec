# CCB Round Checker

`ccb-round-checker` is an experimental Role for whole-round verification after
orchestrator execution.

The round checker creates a round report with an explicit machine-readable
result line. CCB scripts import that report and decide state transitions.

The canonical Role id is `agentroles.ccb_round_checker`. Suggested aliases are
`ccb-round-checker`, `ccb_round_checker`, and `round-checker`.
