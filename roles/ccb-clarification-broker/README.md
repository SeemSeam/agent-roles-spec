# CCB Clarification Broker

`ccb-clarification-broker` is an experimental Role for staged clarification.

The broker works from fresh context per question batch. It reduces planner
candidate questions to the smallest user-facing set, records defaults and
deferrals, and normalizes answers for planner.

The canonical Role id is `agentroles.ccb_clarification_broker`. Suggested
aliases are `ccb-clarification-broker`, `ccb_clarification_broker`, and
`clarification-broker`.
