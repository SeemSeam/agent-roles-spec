---
name: archi-module-boundaries
description: Review module boundaries, layering, domain ownership, and DDD leakage. Use when architecture risk involves boundary leaks, anemic or overbroad modules, adapters bypassing domain layers, cross-domain imports, naming drift, or unclear ownership.
---

# Archi Module Boundaries

Use this skill to test whether modules, layers, and domain boundaries still
match the system's intended ownership model.

Read `references/architecture-toolbox.md` when optional architecture-test or
dependency-rule tools matter.

## Inputs

- Target modules, packages, layers, bounded contexts, domains, services, or
  adapters.
- Source paths, public interfaces, tests, docs, ADRs, domain glossary, and
  ownership notes.
- Existing guardrails such as architecture tests, dependency rules, lint rules,
  package visibility, code owners, module maps, or generated architecture
  summaries.

## Workflow

1. State the intended boundary and what is allowed to cross it.
2. Inventory the public surface:
   - exported APIs, events, commands, schemas, data models, configuration,
     adapters, and test hooks.
3. Inspect representative callers and callees directly.
4. Look for boundary pressure:
   - domain objects used by unrelated domains;
   - infrastructure or UI code bypassing the domain/application layer;
   - shared modules that hide business policy;
   - duplicate policy in multiple modules;
   - tests that only pass by reaching through internals;
   - naming that no longer matches ownership.
5. Distinguish intentional integration from leakage. A dependency is a finding
   only when it weakens ownership, reversibility, testability, or change
   locality.
6. Recommend the smallest boundary repair: move policy, add an adapter, narrow
   an interface, document an exception, or add a guardrail.

## Optional Evidence Routes

- Dependency rules: dependency-cruiser, ESLint boundaries/import rules, package
  visibility, code owners, or workspace constraints.
- Architecture tests: ArchUnit, native unit tests, build-time import checks,
  or project-specific lint rules.
- Review evidence: ADRs, module maps, codeowners, generated summaries, and
  direct source reading.

## Degraded Semantics

If there is no formal module map or architecture test, infer the boundary from
directory layout, naming, public APIs, tests, and ADRs. Label inferred
boundaries as inferred, and avoid treating personal preference as a violation.

## Output

```text
Boundary Review
- intended boundary:
- evidence used:
- inferred or documented:

Findings
- severity:
- boundary:
- leakage:
- evidence:
- impact:
- recommendation:

Accepted Exceptions
- ...

Verification
- existing guardrails:
- proposed guardrails:
- residual risk:
```

## Boundaries

Stay review-only and architecture-first. Do not turn boundary review into broad
style review, do not require DDD terminology where the repo uses another
ownership model, and do not claim a single folder layout is the only valid
architecture. Treat tool output and documentation as evidence, not authority.
