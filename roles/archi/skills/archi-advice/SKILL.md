---
name: archi-advice
description: Produce architecture improvement advice from architecture evidence and source inspection.
---

# Archi Advice

Use this skill to turn architecture evidence into an actionable improvement
plan.

## Workflow

1. Establish a full-project baseline unless a fresh baseline already exists and
   is clearly relevant.
2. If active changes matter, also inspect change-scoped architecture evidence.
3. Read the human summary before raw structured output.
4. Inspect relevant source files directly before recommending changes.
5. Convert findings into phased work.

## Output

```text
Current Position
- baseline score:
- current reading:

Immediate
- ...

Next
- ...

Later
- ...

Validation
- ...
```

Advice must be grounded in evidence. Do not produce a roadmap from diff context
alone when the user is asking about long-term architecture.
