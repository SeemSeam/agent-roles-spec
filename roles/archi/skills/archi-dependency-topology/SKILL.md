---
name: archi-dependency-topology
description: Review dependency topology, cycles, direction, and import/workspace graph risk. Use when architecture risk depends on dependency direction, circular dependencies, package graph shape, layering imports, workspace coupling, or replacing Architec with source-backed topology evidence.
---

# Archi Dependency Topology

Use this skill to review structural dependency shape. This is a method, not a
tool requirement.

Read `references/architecture-toolbox.md` when selecting optional dependency
graph tools or explaining provenance.

## Inputs

- User scope: diff, package, module, workspace, full repo, or target boundary.
- Source files, package manifests, build files, module docs, and import paths.
- Existing dependency evidence when present: lockfiles, workspace manifests,
  dependency-cruiser/Madge/ESLint import rules, ArchUnit tests, CodeQL/Semgrep
  findings, Architec/Hippo artifacts, or CI reports.

## Workflow

1. Define the expected direction of dependencies in plain language.
2. Build the lightest useful topology map from available source:
   - packages, modules, layers, domains, adapters, generated code, tests;
   - inbound and outbound dependencies for the reviewed scope;
   - known cycles, fan-in/fan-out hotspots, and cross-layer shortcuts.
3. Compare observed edges with the expected direction.
4. Classify each concern:
   - cycle that affects initialization, testing, release, or ownership;
   - dependency inversion pressure;
   - shared utility or platform module becoming a hidden domain dependency;
   - generated or test-only dependency that should not be treated as runtime;
   - optional edge that is acceptable but needs documentation.
5. Verify actionable claims against source paths. Tool output is evidence, not
   fact.
6. Recommend the smallest topology change or guardrail that reduces risk.

## Optional Evidence Routes

- JS/TS: dependency-cruiser, Madge, ESLint import/no-cycle or boundaries rules.
- JVM: ArchUnit slices, layers, and cycle checks.
- Multi-language repos: workspace/build graph, package manifests, module maps,
  CI dependency reports, and direct source inspection.
- Security/dataflow adjacency: CodeQL or Semgrep evidence only when topology
  risk includes unsafe flow, not as a general architecture oracle.

Do not install tools or refresh generated graphs unless the user asks for fresh
evidence or stale topology is central to the answer.

## Degraded Semantics

If no graph tool is available, produce a source-backed topology sketch from
manifests, imports, changed files, and docs. Mark missing graph coverage as
residual risk instead of stopping the review.

## Output

```text
Topology Review
- expected direction:
- evidence used:
- observed graph:

Findings
- severity:
- edge or cycle:
- evidence:
- impact:
- recommendation:

Guardrails
- existing:
- proposed:
- verification:

Residual Risk
- ...
```

## Boundaries

Stay review-only. Do not approve releases, rewrite architecture rules, mutate
generated graph artifacts, or claim that a clean graph proves runtime
correctness.
