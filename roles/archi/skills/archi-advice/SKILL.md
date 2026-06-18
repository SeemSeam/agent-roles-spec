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
3. Use `archi-evidence-map` when selecting optional tools or when Architec is
   unavailable.
4. Use vendored `improve-codebase-architecture` when advice should identify
   deepening opportunities or compare interface shapes.
5. Use vendored `receiving-code-review` when advice is based on external
   review feedback that needs verification before action.
6. Read the human summary before raw structured output when tool artifacts
   exist.
7. Inspect relevant source files directly before recommending changes.
8. Convert findings into phased work.

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
alone when the user is asking about long-term architecture. If no tool evidence
exists, ground the roadmap in source inspection, module docs, tests, and
explicit residual risk.
