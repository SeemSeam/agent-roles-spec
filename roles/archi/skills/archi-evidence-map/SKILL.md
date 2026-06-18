---
name: archi-evidence-map
description: Select architecture and code-review evidence sources before an archi review. Use when the user asks which tools to use, wants less dependence on Architec, needs architecture/code review readiness, or needs a review plan across direct source reading, project-native checks, dependency analysis, SAST, and architecture fitness tools.
---

# Archi Evidence Map

Use this skill before `archi-diff`, `archi-full`, `archi-goal`, or
`archi-advice` when the right evidence source is unclear.

Read `references/architecture-toolbox.md` when tool selection, external
provenance, language-specific architecture tests, or skill-library patterns
matter.

When the user asks what public skills or review workflows are fused into
`archi`, answer from the "Public Skills Carried Or Fused Into Archi" section
of that reference and the vendored provenance reference.

## Workflow

1. Classify scope:
   - diff review;
   - full-project baseline;
   - goal-driven refactor;
   - tool readiness;
   - review process design.
2. Inventory available evidence without installing anything:
   - current diff and touched files;
   - project docs, module maps, ADRs, and plan-tree notes;
   - language/build/test files;
   - existing CI/static-analysis configuration;
   - generated `.architec/` and `.hippocampus/` artifacts;
   - dependency or architecture-test configs such as
     `.dependency-cruiser.*`, `codeql.yml`, `semgrep.yml`, or ArchUnit tests.
3. Select the lightest evidence set:
   - direct source review for small diffs or missing tools;
   - project-native tests and type/lint checks for behavior and contract risk;
   - Architec/Hippo for semantic architecture summaries when available;
   - dependency-cruiser or similar dependency graph tools for JS/TS import
     boundaries and circular dependencies;
   - ArchUnit or similar architecture tests for Java/JVM projects;
   - Semgrep or CodeQL for security, data-flow, and policy evidence;
   - vendored `code-review-and-quality` for broad code-review coverage;
   - vendored `improve-codebase-architecture` for deep-module, interface,
     seam, adapter, leverage, and locality analysis;
   - vendored `requesting-code-review` or `receiving-code-review` when the
     task needs independent review handoff or review-feedback triage;
   - hosted or AI review tools only as advisory external signals.
4. Run or request tools only when the user asked for fresh evidence, the
   snapshot is stale, or the missing evidence is central to the question.
5. Read tool output as evidence, not authority. Verify actionable findings
   against source files.
6. Route:
   - active patch risk -> `archi-diff`;
   - full baseline -> `archi-full`;
   - specific refactor/objective -> `archi-goal`;
   - roadmap or sequencing -> `archi-advice`.

## Output

```text
Evidence Plan
- scope:
- direct files:
- existing artifacts:
- optional tools:
- skipped tools and why:

Review Route
- next skill:
- expected output:

Risks
- missing evidence:
- false-positive risk:
- verification needed:
```

Keep the plan short. Do not block architecture review just because Architec or
another optional tool is missing.
