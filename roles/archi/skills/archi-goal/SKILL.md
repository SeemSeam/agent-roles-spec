---
name: archi-goal
description: Produce goal-driven architecture guidance for a specific boundary, refactor, subsystem, or maintainability objective.
---

# Archi Goal

Use this skill when the user gives a specific architecture objective.

## Workflow

1. Restate the goal as an architecture constraint.
2. Identify the relevant modules, ownership boundaries, and runtime contracts.
3. Use full-project evidence when the goal depends on whole-project structure.
4. Use diff evidence when the goal is about an active patch.
5. Read targeted source files directly.
6. Return a staged plan with gates.

## Output

```text
Goal
- ...

Relevant Boundaries
- ...

Plan
1. ...
2. ...
3. ...

Risks
- ...

Gates
- ...
```

Keep the plan practical. Prefer preserving current working behavior over broad
rewrites.
