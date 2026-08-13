---
name: archi-fitness-functions
description: Propose and review architecture fitness functions, executable guardrails, and quality gates. Use when architecture findings should become repeatable checks, CI gates, dependency rules, architecture tests, ADR checks, Semgrep/CodeQL policies, or migration exit criteria.
---

# Archi Fitness Functions

Use this skill to turn architecture intent into repeatable evidence. A fitness
function can be a test, lint rule, dependency rule, query, checklist, dashboard
threshold, or review gate, as long as it is observable and maintained.

Read `references/architecture-toolbox.md` when choosing optional tools or
explaining why a tool is only advisory.

## Inputs

- Architecture risk, invariant, decision, or migration goal to guard.
- Existing tests, CI, dependency rules, ADRs, code scanning, dashboards, and
  release gates.
- Target language, build system, team workflow, and tolerance for false
  positives.

## Workflow

1. Restate the invariant in testable language.
2. Decide whether the invariant is static, behavioral, operational, or
   process/decision based.
3. Prefer the cheapest existing project-native guardrail:
   - native test framework;
   - dependency or import rule;
   - architecture test;
   - Semgrep or CodeQL policy;
   - ADR/status check;
   - CI or release checklist;
   - observability/SLO gate for distributed reliability.
4. Define the evidence target:
   - what fails;
   - what passes;
   - who owns exceptions;
   - how false positives are triaged;
   - when the gate can be retired.
5. Review whether the gate would catch the actual risk without blocking
   unrelated work.
6. Recommend rollout sequence: advisory check, warning threshold, blocking
   threshold, cleanup or retirement.

## Optional Evidence Routes

- ArchUnit for JVM layer, slice, package, and cycle tests.
- dependency-cruiser or ESLint import rules for JS/TS dependency direction.
- Semgrep for custom syntax or policy checks when pattern matching is enough.
- CodeQL for deeper semantic/security/dataflow checks where supported.
- Native tests, CI scripts, module maps, ADR linting, SLO dashboards, and git
  history when they are already present.

Do not add tools or mutate project configuration. When implementation is
requested, produce the proposed gate, verification plan, and a bounded handoff
for an implementation Role.

## Degraded Semantics

If no automation is available, produce a manual review checklist with clear
evidence, owner, and promotion path to automation. Do not pretend a checklist
is an executable test.

## Output

```text
Fitness Function Proposal
- invariant:
- risk guarded:
- recommended route:
- current evidence:

Gate Design
- pass condition:
- fail condition:
- false-positive handling:
- owner:
- rollout:

Implementation Sketch
- files or configs likely affected:
- command or review step:
- non-goals:

Verification
- how this catches the risk:
- residual gaps:
```

## Boundaries

Stay review-only. Do not implement the gate, modify CI, or install tools; hand
implementation to a write-enabled Role. Do not claim a gate proves runtime
correctness, security, or release readiness by itself. Treat tool output and
documentation as evidence, not authority.
