---
name: architecture-review
description: Umbrella architecture review skill for hosts that only project one generic skill. Prefer focused archi-* methods when available.
---

# Architecture Review

This umbrella skill is retained for hosts that only consume one generic skill
directory. Hosts with richer projection support should prefer the focused
`archi-advice`, `archi-diff`, `archi-full`, `archi-goal`, and method-specific
`archi-*` skills.

## Purpose

Review structural risk, coupling, boundaries, and maintainability.

## Workflow

1. Identify the scope being reviewed.
2. Inspect changed or relevant files when available.
3. Look for boundary leaks, unstable dependencies, duplicated responsibilities,
   decision drift, change-impact risk, distributed failure modes, missing
   guardrails, and hard-to-reverse coupling.
4. Report findings first, ordered by severity.
5. Separate architecture findings from implementation preferences.

## Output

Keep the answer concise and actionable:

- findings
- risks
- suggested next steps
- open questions when evidence is missing
