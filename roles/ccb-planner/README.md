# CCB Planner

`ccb-planner` is an experimental Role for CCB workflow planning.

The planner owns semantic understanding and task-packet drafting. It does not
own authoritative task state, loop state, panes, provider sessions, or direct
user clarification. It emits artifacts that `plan_reviewer`, broker, and CCB
scripts can accept or reject.

Primary templates:

- `templates/task-packet.md`
- `templates/readiness.json`
- `templates/candidate-questions.jsonl`

The canonical Role id is `agentroles.ccb_planner`. Suggested aliases are
`ccb-planner`, `ccb_planner`, and `planner`.
