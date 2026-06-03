---
name: archi-diff
description: Review current changes for architecture risk, boundary pressure, coupling, duplication, and maintainability impact.
---

# Archi Diff

Use this skill for change-scoped architecture review.

## Workflow

1. Inspect the available architecture-analysis command shape before assuming
   flags.
2. Run or read incremental architecture review evidence.
3. Read `.architec/architec-summary.md` first when present.
4. Use `.architec/architec-analysis.json` for exact scores, concerns, signals,
   hotspots, and artifact paths.
5. Focus on changed-component concerns, boundary pressure, duplication,
   hotspots, and recommendations.

## Output

Lead with the verdict:

```text
Verdict
- diff status:
- incremental score:

Blocking Issues
- ...

Impacted Areas
- ...

Required Changes
- ...
```

Do not paste raw JSON. Use direct code references for findings that need
engineering action.
