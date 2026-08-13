# Architecture And Code Review Toolbox

Access date: 2026-06-17. Updated: 2026-07-10.

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

2026-07-10 addendum:

- Goal: expand `archi` beyond optional Architec evidence with complementary,
  reproducible architecture-review methods.
- Non-goals: make `archi` a generic code reviewer, require Architec, vendor
  more external skills, copy license-unclear tool examples, or add hidden tool
  installs.
- Required capability areas: dependency topology, module boundaries, fitness
  functions, decision drift, change impact, and distributed-system reliability
  tradeoffs.
- Shape decision: `single_role`. These are focused methods under the same
  architecture reviewer identity, not separate agent identities.

## Coverage Audit

| Existing surface | Covered before 0.5.0 | Gap or duplication | Decision |
| --- | --- | --- | --- |
| `archi-evidence-map` | Tool-independent evidence selection and optional Architec fallback | Routing existed, but did not provide repeatable methods for each architecture concern | Keep and route to new method skills. |
| `archi-diff` | Change-scoped architecture review | Touched blast radius but did not force migration, rollback, and reversibility analysis | Keep and route impact-heavy work to `archi-change-impact`. |
| `archi-full` | Full baseline review | Broad baseline could hide topology, decision, or reliability details | Keep as entrypoint and route focused concerns. |
| `archi-goal` | Goal-driven refactor or boundary guidance | Goal plans lacked explicit method split for topology, fitness, decision, and reliability cases | Keep and route to focused methods. |
| `archi-advice` | Phased improvement roadmap | Roadmap could become generic without a repeatable evidence model | Keep and require focused methods where relevant. |
| `architecture-review` | Generic umbrella for limited hosts | Overlaps all focused skills | Retain only as compatibility umbrella; add YAML frontmatter and direct hosts to focused skills. |
| Vendored code-review skills | Broad quality, deepening, review handoff, feedback triage | Useful but can pull `archi` toward generic code review | Keep as secondary support and preserve architecture-first memory boundary. |

## 2026-07-10 Inspected Sources

| Source | Authority | License / provenance | Treatment | Design impact |
| --- | --- | --- | --- | --- |
| ArchUnit user guide and GitHub repo | official / maintained | Apache-2.0 reported by upstream; no content copied | `referenced_only` | Supports architecture tests for JVM layers, slices, dependencies, and cycles. |
| dependency-cruiser GitHub README and rules reference | maintained | MIT license reported by GitHub; no content copied | `referenced_only` | Supports JS/TS dependency direction, cycles, rule severities, and graph evidence. |
| Semgrep Community Edition and rule-writing docs | official | CE is LGPL-2.1; Semgrep-maintained rules use Semgrep Rules License v1.0; no rules copied | `referenced_only` | Use for optional custom syntax/policy/dataflow checks; do not vendor Semgrep rules. |
| GitHub CodeQL docs and CodeQL repo | official / maintained | CodeQL repo is MIT; product use may depend on GitHub Code Security terms; no content copied | `referenced_only` | Use for optional semantic/security/dataflow evidence where supported. |
| C4 model official site | official | Creator-maintained website; no diagrams or text copied | `synthesized` | Supports tool-independent context/container/component/dynamic/deployment mapping. |
| adr.github.io, MADR, and adr-tools | maintained community | MADR is MIT OR CC0-1.0; adr-tools has license files but was not copied | `synthesized` | Supports decision-log review, ADR status drift, and superseding-decision workflow. |
| AWS Well-Architected Reliability Pillar | official | AWS documentation; no content copied | `synthesized` | Supports reliability review vocabulary around resilience, failure management, monitoring, and testing. |
| OpenTelemetry observability primer | official | CNCF/OpenTelemetry documentation; no content copied | `synthesized` | Supports trace/log/metric evidence for distributed request paths and failure-mode review. |

## 2026-07-10 Candidate Scorecard

Scores are 0 to 3. User-priority override: portability and review-only
behavior outweigh tool depth.

| Candidate capability | Relevance | Authority | License safety | Host fit | Runtime boundary | Dependency risk | Security posture | Testability | Role fit | Decision |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Dependency topology/cycles/direction | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | Add `archi-dependency-topology`. |
| Module boundary/layering/DDD leakage | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | Add `archi-module-boundaries`. |
| Architecture fitness functions | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | Add `archi-fitness-functions`. |
| ADR/decision consistency/assumption drift | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | Add `archi-decision-drift`. |
| Change impact/blast radius/migration/reversibility | 3 | 2 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | Add `archi-change-impact`. |
| Distributed-system dataflow/failure modes/reliability | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 2 | 3 | Add `archi-distributed-systems`. |
| One large "architecture-methods" skill | 2 | 2 | 3 | 2 | 3 | 3 | 3 | 1 | 1 | Rejected: duplicates existing umbrella skill and weakens triggers. |
| Make Architec the primary architecture engine | 2 | 2 | 3 | 1 | 2 | 1 | 2 | 2 | 1 | Rejected: conflicts with tool-independent role goal. |
| Vendor tool rule packs or ADR templates | 1 | 2 | 1 | 1 | 2 | 1 | 2 | 2 | 1 | Rejected: unnecessary copying and license/tool coupling. |

Hard gates passed because new content is original/synthesized, review-only,
and does not require tool installation, network, credentials, runtime state, or
external rule packs.

## Blueprint Gate

- Role id: `agentroles.archi`
- Version strategy: bump from `0.4.0` to `0.5.0` because the Role contract gains
  six user-visible architecture methods and a mounted-behavior evaluation
  suite.
- Catalog level: remain `stable`; this is a capability expansion with the same
  review-only posture and no new runtime dependency.
- Shape: `single_role`.
- New Role source: six focused `archi-*` skills and `tests/evaluation.toml`.
- Existing surfaces changed: memory, README, evidence map, umbrella review
  skill, focused entrypoint skills, toolbox, tests, catalog README entries, and
  plan-tree status.
- Permission posture: unchanged; `read_files=true`, `write_files=false`,
  `network=false`.
- Adapter posture: CCB Architec path remains optional; no CCB source changes and
  no Python managed venv or global tool additions.
- Exclusions: no copied external tool rules, no hosted AI reviewer integration,
  no generated graph artifacts, no secrets, no provider state, and no project
  runtime evidence in Role source.

## Inspected Sources

| Source | Authority | What was inspected | Design impact |
| --- | --- | --- | --- |
| CodeQL docs and GitHub page | official | semantic code analysis, query/database model, code scanning integration | Treat CodeQL as optional semantic/security evidence, not a generic architecture authority. |
| Semgrep GitHub README | maintained | multi-language static analysis, custom rules, CI/pre-commit use, limitations of community security depth | Use as optional pattern/security/policy evidence; verify findings manually. |
| dependency-cruiser GitHub README | maintained | JS/TS dependency validation, custom rules, graph output | Recommend for JS/TS boundary rules and import-cycle evidence when project already uses it or asks for that route. |
| ArchUnit user guide | official | Java architecture tests, layers, slices, cyclic dependencies, PlantUML rules, metrics | Recommend for JVM architecture fitness tests when the repo is Java/JVM. |
| Claude Code Review docs | official | multi-agent PR review, severity, dedupe, customization via review instructions, local diff review | Borrow pattern: findings are advisory, deduped, severity-ranked, and do not approve/block automatically. |
| C4 model official site | official | tool-independent architecture abstractions and diagrams | Use as optional dataflow/topology vocabulary, not as required notation. |
| adr.github.io / MADR / adr-tools | maintained community | ADR vocabulary, decision logs, status/superseding workflows, lightweight templates | Use as optional decision-drift evidence; no templates copied. |
| AWS Reliability Pillar | official | reliability, failure management, observability, and recovery strategy guidance | Use as optional reliability-review vocabulary; no cloud-specific prescription. |
| OpenTelemetry observability primer | official | traces, spans, logs, metrics, SLIs/SLOs, distributed tracing | Use as optional evidence model for distributed request paths and failure-mode review. |
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
- https://c4model.com/
- https://adr.github.io/
- https://adr.github.io/madr/
- https://github.com/npryce/adr-tools
- https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html
- https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/shared-responsibility-model-for-resiliency.html
- https://opentelemetry.io/docs/concepts/observability-primer/
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
| C4/diagram-as-code evidence | recommend when available | medium | Helpful for dataflow and container/component boundaries; notation should not replace source verification. |
| ADR/MADR/decision tools | recommend when available | medium-high | Useful for decision consistency and assumption drift; absence should degrade to inferred decision review. |
| OpenTelemetry/SLO/runbook evidence | recommend when available | medium-high | Useful for distributed failure-mode and reliability review; absence should be reported as missing operational evidence. |
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
   - Decision consistency: ADRs, design docs, git history, and decision logs.
   - Distributed systems: C4-style maps, traces, runbooks, service maps,
     SLO/SLI evidence, and failure-mode notes.
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
- operational blast radius;
- decision drift and stale assumptions;
- dataflow, failure mode, and reliability tradeoffs;
- architecture fitness functions and guardrail quality.

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
