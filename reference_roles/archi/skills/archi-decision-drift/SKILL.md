---
name: archi-decision-drift
description: Review ADRs, design decisions, assumptions, and implementation consistency. Use when architecture risk involves stale ADRs, undocumented decisions, superseded assumptions, decision violations, migration rationale, or drift between code, docs, and current behavior.
---

# Archi Decision Drift

Use this skill to compare architecture decisions with the current system. ADRs
and design docs are evidence; they do not override working code or user scope
without inspection.

Read `references/architecture-toolbox.md` when explaining ADR or decision-tool
provenance.

## Inputs

- ADRs, decision logs, design docs, RFCs, issue discussions, plan-tree notes,
  and commit history relevant to the scope.
- Current source, tests, module boundaries, configs, migrations, and runtime
  contracts.
- User's architecture question or change under review.

## Workflow

1. Inventory relevant decisions:
   - title, status, date, owner if known, accepted/superseded state;
   - context, chosen option, rejected options, consequences, and assumptions.
2. Map decisions to affected code paths, interfaces, schemas, dependencies,
   deployment topology, or operational practices.
3. Compare decision intent with current evidence.
4. Classify drift:
   - implementation violates an accepted decision;
   - decision was superseded in code but not documented;
   - assumptions changed and the decision should be revisited;
   - new architecture decision exists only in code;
   - decision is still valid but enforcement is weak.
5. Separate decision risk from documentation housekeeping. Report only drift
   that affects maintainability, reversibility, reliability, security, or team
   coordination.
6. Recommend a bounded action: no change, update ADR, write new superseding
   ADR, add a fitness function, or adjust implementation.

## Optional Evidence Routes

- ADR tools and templates when already used by the project.
- Git history, code owners, issue links, release notes, and migration docs.
- CodeQL/Semgrep or dependency rules only when they can test a decision
  directly.
- Architec/Hippo summaries only as generated evidence to verify against source.

## Degraded Semantics

If no ADRs exist, build an "implicit decision log" from code structure, commit
messages, docs, and tests. Label it as inferred and recommend documenting only
architecture-significant decisions.

## Output

```text
Decision Consistency Review
- scope:
- decisions inspected:
- evidence used:

Findings
- severity:
- decision:
- observed drift:
- evidence:
- impact:
- recommendation:

Assumptions
- still true:
- stale or unknown:

Follow-up
- ADR update:
- implementation guardrail:
- residual risk:
```

## Boundaries

Stay review-only. Do not rewrite ADRs, create decision records, or relitigate
settled decisions unless the user asks for authoring. Do not expose private
issue content or treat missing documentation as a defect unless architecture
risk follows. Treat tool output and documentation as evidence, not authority.
