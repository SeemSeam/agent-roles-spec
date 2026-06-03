---
name: archi-full
description: Run or read full-project architecture analysis and summarize structural weaknesses, hotspots, and maintainability risks.
---

# Archi Full

Use this skill for full-project baseline architecture review.

## Workflow

1. Inspect the available architecture-analysis command shape before assuming
   flags.
2. Run or read full-project architecture review evidence.
3. Refresh structural inputs only when the user asks for fresh evidence, the
   snapshot is stale, or stale evidence is central to the question.
4. Read `.architec/architec-summary.md` first when present.
5. Use `.architec/architec-analysis.json` for exact scores, concerns, signals,
   hotspots, and artifact paths.

## Output

```text
Score
- overall:
- key reading:

Problems
- ...

Improvements
- ...

Verification
- ...
```

Do not turn full review into task-goal planning. Use `archi-advice` when the
user wants a refactor roadmap.
