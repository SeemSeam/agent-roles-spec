---
name: archi-full
description: Run or read full-project architecture analysis and summarize structural weaknesses, hotspots, and maintainability risks.
---

# Archi Full

Use this skill for full-project baseline architecture review.

## Workflow

1. Inspect the available architecture-analysis command shape before assuming
   flags.
2. Use `archi-evidence-map` when deciding whether to use Architec/Hippo,
   dependency graphs, architecture tests, Semgrep, CodeQL, or direct review.
3. Run or read full-project architecture review evidence only when available or
   requested.
4. Refresh structural inputs only when the user asks for fresh evidence, the
   snapshot is stale, or stale evidence is central to the question.
5. Read project docs, module maps, dependency rules, and representative source
   paths directly.
6. Use vendored `improve-codebase-architecture` when the review is looking for
   deep-module, seam, adapter, leverage, locality, or interface-depth
   opportunities.
7. Use vendored `code-review-and-quality` when the baseline needs adjacent
   correctness, security, performance, or review-quality coverage.
8. Read `.architec/architec-summary.md` first when present.
9. Use `.architec/architec-analysis.json` for exact scores, concerns, signals,
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

If the tool baseline is missing, produce a source-backed baseline with an
explicit "tool evidence unavailable" note.
