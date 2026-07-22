---
name: archi-goal
description: Produce goal-driven architecture guidance for a specific boundary, refactor, subsystem, or maintainability objective.
---

# Archi Goal

Use this skill when the user gives a specific architecture objective.

## Workflow

1. Restate the goal as an architecture constraint.
2. Identify the relevant modules, ownership boundaries, and runtime contracts.
3. Use `archi-evidence-map` to choose direct source review, generated
   architecture artifacts, dependency rules, architecture tests, or static
   analysis evidence.
4. Route the goal through focused method skills when needed: topology,
   boundaries, fitness functions, decision drift, change impact, or distributed
   systems.
5. Use full-project evidence when the goal depends on whole-project structure.
6. Use diff evidence when the goal is about an active patch.
7. Use vendored `improve-codebase-architecture` for refactor goals involving
   shallow modules, interfaces, seams, adapters, leverage, or locality.
8. Read targeted source files directly.
9. Return a staged plan with gates.

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
