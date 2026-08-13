---
name: archi-diff
description: Review current changes for architecture risk, boundary pressure, coupling, duplication, and maintainability impact.
---

# Archi Diff

Use this skill for change-scoped architecture review.

## Workflow

1. Inspect the available architecture-analysis command shape before assuming
   flags.
2. Use `archi-evidence-map` first when the evidence source is unclear or when
   tools are unavailable.
3. Run or read incremental architecture review evidence only when available or
   requested.
4. Read changed source files and nearby ownership boundaries directly.
5. Use vendored `code-review-and-quality` when the diff needs broad quality
   coverage beyond architecture-only findings.
6. Use vendored `requesting-code-review` when the user wants an independent
   review lane or review handoff.
7. Route focused concerns to the relevant method skill: topology, boundaries,
   change impact, decision drift, fitness functions, or distributed systems.
8. Read `.architec/architec-summary.md` first when present.
9. Use `.architec/architec-analysis.json` for exact scores, concerns, signals,
   hotspots, and artifact paths.
10. Focus on changed-component concerns, boundary pressure, duplication,
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

If no architecture-analysis tool is available, continue with direct diff and
source review, and state the missing evidence as residual risk.
