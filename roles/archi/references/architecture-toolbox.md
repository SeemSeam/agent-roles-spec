# Architecture And Code Review Toolbox

Access date: 2026-06-17.

This reference records the research basis for making `agentroles.archi` less
dependent on one architecture CLI. It should guide evidence selection, not
install tools automatically. Public/open-source skills may be carried in the
Role package when provenance and license checks pass; see
`vendored-skill-provenance.md`.

## Research Brief

- Goal: improve `archi` so it can review architecture and code-review risk
  with direct source reading, project-native checks, and optional tools.
- Target hosts: Codex, Claude Code, CCB, Hive.
- Non-goals: bundle hosted AI reviewers, install global tools silently, carry
  license-unclear external skills, or replace human release approval.
- Minimum evidence: inspect maintained tool docs/repos and representative
  skill libraries for review workflow patterns.

## Inspected Sources

| Source | Authority | What was inspected | Design impact |
| --- | --- | --- | --- |
| CodeQL docs and GitHub page | official | semantic code analysis, query/database model, code scanning integration | Treat CodeQL as optional semantic/security evidence, not a generic architecture authority. |
| Semgrep GitHub README | maintained | multi-language static analysis, custom rules, CI/pre-commit use, limitations of community security depth | Use as optional pattern/security/policy evidence; verify findings manually. |
| dependency-cruiser GitHub README | maintained | JS/TS dependency validation, custom rules, graph output | Recommend for JS/TS boundary rules and import-cycle evidence when project already uses it or asks for that route. |
| ArchUnit user guide | official | Java architecture tests, layers, slices, cyclic dependencies, PlantUML rules, metrics | Recommend for JVM architecture fitness tests when the repo is Java/JVM. |
| Claude Code Review docs | official | multi-agent PR review, severity, dedupe, customization via review instructions, local diff review | Borrow pattern: findings are advisory, deduped, severity-ranked, and do not approve/block automatically. |
| addyosmani agent-skills code-review-and-quality | community / maintained | five-axis review pattern: correctness, readability, architecture, security, performance | Vendored intact as a broad code-review skill; `archi` memory still keeps release approval advisory. |
| mattpocock skills improve-codebase-architecture | community / maintained | deep-module architecture review, interface depth, locality, seam and adapter vocabulary | Vendored with modifications to remove host-specific writing/browser side effects while retaining architecture deepening analysis. |
| obra superpowers requesting/receiving-code-review | community / maintained | independent code-review lane and rigorous review-feedback handling | Vendored intact as compact review workflow skills. |
| awesome-skills code-review-skill | community | progressive disclosure with stack-specific references | Borrow pattern only: keep `archi` core concise and route stack-specific details to references/tools. |
| maragudk skills | community | competing-agent code-review pattern and decisions/design-doc skills | Borrow pattern only: independent review lanes are useful when high-risk changes need more than one viewpoint. |

Source locators:

- https://codeql.github.com/
- https://docs.github.com/code-security/code-scanning/introduction-to-code-scanning/about-code-scanning-with-codeql
- https://github.com/semgrep/semgrep
- https://github.com/sverweij/dependency-cruiser
- https://www.archunit.org/userguide/html/000_Index.html
- https://code.claude.com/docs/en/code-review
- https://github.com/addyosmani/agent-skills/blob/main/skills/code-review-and-quality/SKILL.md
- https://github.com/mattpocock/skills/blob/main/skills/engineering/improve-codebase-architecture/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/requesting-code-review/SKILL.md
- https://github.com/obra/superpowers/blob/main/skills/receiving-code-review/SKILL.md
- https://github.com/awesome-skills/code-review-skill
- https://github.com/maragudk/skills
- https://github.com/getsentry/skills/blob/main/skills/code-review/SKILL.md

## Public Skills Carried Or Fused Into Archi

Selected sources are now carried directly under `skills/vendor/`. Sources that
are too broad, too project-specific, or tool-permission heavy remain patterns
or references only.

| Public source | Treatment | Role surface |
| --- | --- | --- |
| `addyosmani/agent-skills` `code-review-and-quality` | `vendored_intact` | `skills/vendor/code-review-and-quality` |
| `mattpocock/skills` `improve-codebase-architecture` | `vendored_modified` | `skills/vendor/improve-codebase-architecture` |
| `obra/superpowers` `requesting-code-review` | `vendored_intact` | `skills/vendor/requesting-code-review` |
| `obra/superpowers` `receiving-code-review` | `vendored_intact` | `skills/vendor/receiving-code-review` |
| `awesome-skills/code-review-skill` | `referenced_only` | toolbox guidance only; full stack pack deferred |
| `maragudk/skills` | `synthesized` | review-lane and decision-workflow pattern only |
| Claude Code Review docs | `synthesized` | advisory, evidence-backed review posture |

Detailed refs, license values, commit refs, and excluded files are recorded in
`references/vendored-skill-provenance.md`.

## Candidate Scorecard

| Candidate | Status | Fit | Notes |
| --- | --- | --- | --- |
| Direct source review + project-native tests | keep as default | high | Always available, lowest dependency risk, catches local contract and boundary impact when done carefully. |
| Vendored code-review-and-quality | keep active | high | Useful broad quality gate that complements architecture review with correctness, security, and performance axes. |
| Vendored improve-codebase-architecture | keep active with modifications | high | Strong fit for architecture deepening, interface depth, locality, seams, and adapters. |
| Vendored requesting/receiving-code-review | keep active | medium-high | Useful when archi is part of a review workflow with separate analysis and feedback handling lanes. |
| Architec/Hippo | keep optional | high | Good semantic architecture summary when installed; must not be the only review path. |
| dependency-cruiser | recommend for JS/TS | medium-high | Strong fit for import boundaries, circular dependencies, and dependency graphs in JS/TS projects. |
| ArchUnit | recommend for JVM | medium-high | Strong fit for executable architecture rules in Java/JVM projects. |
| Semgrep | recommend as optional policy/security evidence | medium | Useful for custom rules and many languages; security findings can be noisy or shallow without paid/deeper analysis. |
| CodeQL | recommend as optional semantic/security evidence | medium | Powerful where GitHub/code scanning or CodeQL databases exist; heavier setup than direct review. |
| Hosted AI PR reviewers | advisory only | low-medium | Useful external signal, but not portable Role source and may involve account, cost, and data-boundary concerns. |
| Large generic code-review skill packs | referenced only | medium | Useful progressive-disclosure examples, but too broad to project by default. |

## Evidence Selection Rules

Use this order unless the user requests a specific tool:

1. Direct code reading, diff, tests, module docs, ADRs, and project plans.
2. Existing generated artifacts such as `.architec/` or `.hippocampus/`.
3. Existing project-native architecture checks.
4. Optional language/tool-specific evidence:
   - JS/TS boundaries: dependency-cruiser, Madge, ESLint import rules.
   - Java/JVM architecture rules: ArchUnit.
   - Security/policy patterns: Semgrep or CodeQL.
   - Complexity or hotspots: project-native metrics, existing CI, or Architec.
5. Hosted reviewers only as external advisory context.

Do not install or update tools unless the user asked for fresh tool evidence
or the Host Adapter explicitly owns that lifecycle.

## Review Axes

`archi` remains architecture-first. It should report adjacent code-review risk
only when it changes structural maintainability:

- boundary integrity;
- dependency direction;
- duplication and shadow paths;
- abstraction fit;
- module ownership and naming;
- cross-cutting security/data-flow assumptions;
- testability and rollback gates;
- migration or compatibility debt;
- operational blast radius.

For pure correctness, style, or security-only findings, label them as adjacent
risk and keep architecture findings first.

## Rejected Or Deferred

- Copying license-cleared focused skills: allowed and used for selected
  vendored skills above.
- Making Semgrep, CodeQL, dependency-cruiser, ArchUnit, or Architec required:
  rejected because `archi` must remain portable and review-only.
- Installing hosted AI review tools: rejected for Role source; account,
  pricing, privacy, and provider state belong outside Role source.
- Copying `awesome-skills/code-review-skill` in full: deferred because it is a
  large multi-language pack with Bash/WebFetch expectations; keep it as a
  reference until a host adapter explicitly wants that bundle.
- Copying Sentry-specific code-review guidance: deferred because it is useful
  but too project-specific for a general architecture Role.
