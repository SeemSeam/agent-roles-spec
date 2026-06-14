# Mother Research And Role Design Capability

Date: 2026-06-13

## Purpose

This topic defines the next capability target for `agentroles.mother`: it
should become a strong research-and-design Role for discovering relevant
skills/plugins/workflows, extracting reusable behavior, designing high-quality
Agent Roles, and validating the resulting Role source before catalog
publication.

The target is not "mother can browse the web" as a vague capability. The target
is a repeatable research-to-design pipeline with evidence, gates, and tests.

## Capability Goal

`mother` should be able to take a broad request such as "make a database
performance role", "turn this plugin into a Role", or "find good skills for
security review" and produce:

- a research question and source plan;
- candidate sources with provenance, license, maintenance, and relevance notes;
- a source inventory for promising candidates;
- a scorecard comparing candidates and explaining why some were rejected;
- a Role design blueprint with identity, boundaries, skills, references, tools,
  adapters, permissions, version, catalog level, aliases, and validation plan;
- a write-gated Role scaffold or patch only after the blueprint is clear;
- an evaluation report showing realistic prompts, expected behavior, test
  coverage, and residual risks.

## Current Baseline

Landed in `agentroles.mother` `0.2.1` and `0.2.2`:

- `role-source-ingest` skill for local external-source analysis;
- source-ingest/write-gate rules in `memory.md`;
- local `scripts/inventory_external_source.py`;
- external-source research workflow in
  `references/skill-construction-research.md`;
- focused `role-research`, `role-candidate-score`, and `role-blueprint`
  skills;
- research brief, candidate scorecard, Role blueprint, and evaluation report
  templates;
- research evidence, candidate scorecard, Role blueprint, and evaluation report
  preview schemas;
- hardened citation, confidence, rejected-candidate, split-decision,
  license-gate, and adversarial-review memory rules;
- README/i18n and test coverage for the new source-ingest capability.

This is necessary but not enough for a "strong" mother. It can inspect local
source and enforce evidence/scorecard/blueprint gates, but it does not yet have
deterministic candidate-scoring, forbidden-content audit, draft-check tooling,
golden fixtures, or forward-testing system.

## 2026-06-13 Mother Self-Review

`mother` reviewed this plan from the perspective of a "mother Role" that should
have heavy research and Role production capacity. The review accepted the
direction but found one central weakness: the plan describes the right outputs,
but those outputs are not enforceable artifacts yet.

Accepted review findings:

- Research pipeline is directionally right, but artifacts are not yet
  checkable. `research_evidence`, `candidate_scorecard`, `role_blueprint`, and
  `evaluation_report` need templates or schemas before scaffold automation
  grows.
- Candidate scoring needs hard gates, confidence levels, weighting, and
  user-priority overrides. Otherwise weak search results can be rationalized
  into a Role.
- Blueprint must become a machine-checkable contract, not a loose paragraph.
- Evaluation needs fixtures and golden examples, not only a checklist.
- Because the user explicitly accepts a heavier mother, focused skills should
  split sooner: `role-research`, `role-candidate-score`, `role-blueprint`, and
  `role-evaluate` are not premature if they keep behavior enforceable.

Planning decision: make evidence, scoring, blueprint, and evaluation
first-class artifacts before adding more generation power.

## Design Principles

- Research must be evidence-backed. Each design-changing claim should point to
  a source URL/path/ref, access date, local file evidence, or test artifact.
- Search is host-provided. `mother` may use web tools when the host grants
  them, but Role source must not store credentials, API tokens, browser
  profiles, private sessions, or hidden crawler state.
- Official and maintained sources outrank unverified examples. Community
  examples may inspire designs, but should be labeled advisory.
- Role source stays original. Do not copy third-party examples wholesale; carry
  source content only when license/provenance and user intent justify it.
- Design must remain spec-first. Agent Roles source, Project Binding, host
  projection output, and runtime state remain separate.
- Scripts should make fragile checks deterministic; LLM judgment should handle
  semantic synthesis, tradeoffs, and design explanation.
- Partial evidence is acceptable only when labeled. Do not turn weak research
  into authoritative design.
- Strong mother may be intentionally heavy. More skills, longer memory, and
  richer references are acceptable when they improve repeatability,
  enforceability, and role-production quality.
- Generation power must trail evidence quality. Do not add stronger scaffolding
  until research evidence, candidate scoring, blueprint, and evaluation
  artifacts are explicit enough to review.

## Research-To-Role Pipeline

### 1. Intake And Research Framing

`mother` first turns the user's request into a research brief:

- target domain and intended users;
- target host adapters;
- expected tasks and non-goals;
- desired publication target: local draft, `reference_roles/`, or `roles/`;
- whether the user wants one Role, multiple Roles, or a recommendation;
- allowed research surfaces and network constraints;
- minimum evidence needed before writing.

Output: `research_brief` in the conversation or a planning note, not Role
source.

### 2. Source Discovery

Search should be planned, not improvised. `mother` should generate and run a
source plan across available surfaces:

- local repository roles, templates, specs, aliases, and conformance examples;
- official host documentation for supported skill/plugin formats;
- maintained public skill/plugin repositories;
- package registries when the source depends on tools or CLIs;
- release notes, tests, and examples for candidate projects;
- issue trackers only when needed to assess maintenance or known breakage.

Output: candidate list with source, query/path, access date, short rationale,
and first-pass risk notes.

### 3. Candidate Scorecard

Each candidate should be scored before ingestion:

| Dimension | Question |
| --- | --- |
| Relevance | Does it directly support the requested Role's tasks? |
| Authority | Is it official, maintained, or clearly experimental? |
| License/provenance | Can it be carried, adapted, or only referenced? |
| Host fit | Does it map to Agent Roles skills, tools, plugins, or adapters? |
| Runtime boundary | Does it contain sessions, state, installers, or project binding? |
| Dependency risk | Does it require fragile tools, hidden services, or global config? |
| Security posture | Does it touch secrets, credentials, shells, network, or writes? |
| Testability | Are there examples, tests, fixtures, or deterministic checks? |
| Role-shape fit | Is this one Role, multiple Roles, or a topology recipe? |

Scorecards should include:

- hard gates: license unknown for copied content, secret/runtime-state risk,
  no maintainer signal for depended-on tooling, poor host fit, weak testability,
  unclear Role-shape fit;
- confidence: `high`, `medium`, `low`, or `unknown`;
- status: `recommended`, `use-as-reference`, `reject`, or
  `needs-user-decision`;
- user-priority overrides when the user explicitly values speed, stability,
  license safety, host fit, novelty, or local-only use;
- at least one rejected candidate when multiple sources were considered, or an
  explanation when only one source exists.

Output: candidate scorecard with scores, gates, confidence, status, and reject
reasons.

### 4. Source Inventory And Classification

For selected local checkouts, use `role-source-ingest` and
`inventory_external_source.py`. The inventory must identify:

- skills and trigger metadata;
- references, scripts, templates, assets, hooks, plugin manifests, package
  metadata, tests, and licenses;
- imports and links from skills to references/scripts/lib;
- runtime writes, generated files, hidden install state, and provider state;
- suspicious paths, secrets-like text, local absolute paths, and large files.

Output: inventory JSON or summarized inventory evidence.

### 5. Role Design Blueprint

`mother` then synthesizes a blueprint:

- canonical Role id, name, aliases, catalog level, version strategy, and
  maintainers;
- purpose, responsibilities, non-goals, interaction mode, and action posture;
- memory design: durable instructions, boundaries, routing, output style;
- skill set: names, trigger descriptions, workflow, references, scripts/assets,
  validation prompts;
- references: what to keep as long-form knowledge and when to load it;
- tools: deterministic scripts, runbooks, lifecycle notes, doctor/install
  semantics if applicable;
- plugin content: host-native manifests and projection boundaries;
- adapter notes: CCB, Codex, Claude Code, Hive, unsupported behavior, cleanup,
  and Project Binding separation;
- permissions: read/write/network/secrets rationale;
- source-boundary exclusions and provenance notes;
- validation plan and expected catalog/list/install behavior.

Output: blueprint gate. No Role-source write should happen before this gate.

### 6. Scaffold Or Patch

After the blueprint is accepted or the user explicitly asks to proceed,
`mother` may create or patch Role source.

The generated Role should prefer:

- concise `memory.md`;
- focused skills with strong trigger metadata;
- references for long domain rules;
- scripts only for deterministic or repeated checks;
- adapter docs for host-specific projection behavior;
- tests that cover loader, alias, contents inventory, list/install/resolve, and
  any local scripts.

Output state must be one of `complete`, `draft`, `rollback`, or `blocked`.

### 7. Evaluation And Forward Testing

A Role is not strong until realistic behavior is tested. Evaluation should
include:

- metadata and TOML parsing;
- contents path existence;
- alias resolution and catalog discovery;
- local scripts on representative fixtures;
- source-boundary scan for forbidden content;
- realistic prompts for the main skills;
- at least one negative prompt that should be refused or bounced to the user;
- optional forward-testing by a separate agent when the skill is complex.

Output: evaluation report with passed checks, failed checks, residual risks,
and publication recommendation.

## First-Class Artifacts

The next implementation stage should add explicit artifact formats before
adding more scaffold power:

- `research_evidence`: source URL/path/ref, access date, source authority,
  inspected files/pages, extracted facts, confidence, and design impact.
- `candidate_scorecard`: candidate list, hard gates, weighted scores, reject
  reasons, confidence, and user-priority overrides.
- `role_blueprint`: Role id, aliases, catalog level, memory, skills,
  references, tools, plugins, adapters, permissions, provenance, exclusions,
  validation plan, and write scope.
- `evaluation_report`: realistic prompts, negative prompts, metadata checks,
  source-boundary checks, script checks, results, blockers, and residual risk.

Preferred repository shape:

- `roles/mother/templates/research-brief.md`
- `roles/mother/templates/candidate-scorecard.md`
- `roles/mother/templates/role-blueprint.md`
- `roles/mother/templates/evaluation-report.md`
- `roles/mother/schemas/research-evidence.schema.json`
- `roles/mother/schemas/role-blueprint.schema.json`

The schema names are preview implementation details for `mother`; they do not
need to become project-wide Agent Roles spec schemas until proven useful.

## Skill Architecture Target

The current `role-creation-audit` skill remains useful as a high-level entry.
The stronger mother should grow focused skills around it:

- `role-research`: plan and run source discovery; produce candidate list and
  evidence notes.
- `role-source-ingest`: inspect selected local source and classify content.
- `role-candidate-score`: compare sources against relevance, license, host fit,
  maintenance, security, and testability.
- `role-blueprint`: synthesize Role identity, contents, adapter boundaries,
  permission posture, provenance, and validation plan.
- `role-scaffold`: create or patch Role source from an accepted blueprint.
- `role-evaluate`: run tests, fixture prompts, source-boundary checks, and
  readiness review.
- `role-publish-readiness`: verify README/i18n, aliases, catalog level, version,
  digest/update behavior, and human review status.

Because the user explicitly wants a strong mother and accepts a heavier Role,
split sooner rather than later when a workflow needs independent trigger
metadata or artifact discipline. Keep `role-creation-audit` as the top-level
router and keep `role-source-ingest` as the local source-tree inventory path.
The first new focused skills should be `role-research`,
`role-candidate-score`, `role-blueprint`, and `role-evaluate`.

## Memory Hardening Target

`roles/mother/memory.md` should grow stronger long-term rules:

- Always produce a `research_brief` before web/source discovery for broad
  design tasks.
- Never cite a source not actually opened, inspected, or present in local
  evidence.
- Label source confidence: `official`, `maintained`, `community`, `stale`, or
  `unknown`.
- Require at least one rejected candidate when multiple candidates were
  considered, or explain why only one candidate exists.
- Require a `single Role` / `multiple Roles` / `topology recipe` decision before
  scaffolding.
- Require adversarial design review before writing Role source.
- Treat license/provenance uncertainty as a stop gate for copying; synthesize
  patterns only until resolved.
- Define behavior success prompts and failure prompts before publication.

## Tooling Target

P0 landed:

- `inventory_external_source.py`

Next deterministic tools:

- `audit_external_source.py`: forbidden-content and boundary scan over source
  or draft Role.
- `score_role_candidates.py`: normalize candidate scorecards from source
  metadata and user priorities.
- `build_role_blueprint.py`: turn inventory plus user intent into a draft
  blueprint skeleton.
- `check_role_draft.py`: verify required files, contents paths, TOML, aliases,
  list/install/resolve, README/i18n references, and source-boundary issues.
- `extract_skill_triggers.py`: summarize skill names, descriptions, frontmatter,
  examples, and referenced resources.

Scripts should be local and deterministic. Live web search should remain a
host-provided capability unless the project later creates a public registry or
package-manager search API.

## Knowledge Base Target

`references/skill-construction-research.md` should split when it grows:

- `references/research-playbook.md`: search surfaces, query strategy,
  source-authority hierarchy, citation/access-date rules.
- `references/candidate-scorecard.md`: scoring dimensions, reject reasons,
  license/provenance notes, maintenance signals.
- `references/role-blueprint-guide.md`: identity, memory, skill, tool, adapter,
  permission, version, and validation design rules.
- `references/evaluation-fixtures.md`: realistic prompt patterns and expected
  outcomes for role creation, audit, source ingestion, and publication review.

Keep `SKILL.md` files concise; load references only when the task requires
them.

## Roadmap

### v0.2.2: Research Playbook

- Status: landed on 2026-06-14 in `agentroles.mother` `0.2.2`.

- Add first-class artifact templates for research brief, candidate scorecard,
  Role blueprint, and evaluation report.
- Add preview schemas for research evidence, candidate scorecard, Role
  blueprint, and evaluation report.
- Add `role-research`, `role-candidate-score`, and `role-blueprint` focused
  skills.
- Extend mother memory with citation, confidence, rejection, split-decision,
  license stop-gate, and adversarial-review rules.
- Add tests that assert the artifacts, references, and skills exist and require
  source provenance plus access dates.

### v0.3.0: Research Suite

- Add candidate score and forbidden-content audit tooling.
- Add fixtures for local skill repo, plugin repo, and weak/noisy source.
- Add role-design blueprint template with single-role versus multi-role
  decision.
- Add `audit_external_source.py`, `score_role_candidates.py`, and
  `check_role_draft.py`.
- Add tests for candidate scoring, hard gates, and draft checks.
- Split `skill-construction-research.md` into research playbook, scorecard,
  blueprint guide, and fixture references if it grows too large.

### v0.4.0: Design Synthesis

- Add `role-evaluate`, `role-scaffold`, and `role-publish-readiness` focused
  workflows as needed.
- Add evaluation prompts and negative prompts.
- Add forward-test protocol for complex skills.
- Add README/i18n and catalog-readiness verification rules.

### v0.5.0: Publication Readiness

- Add publish-readiness workflow for catalog Roles.
- Add role-quality rubric and promotion criteria from `preview` to `stable`.
- Add documented handoff from mother-produced blueprint to maintainer review.
- Consider package-manager-level `agent-roles scaffold` or `check-blueprint`
  only after the Role workflow stabilizes.

## Acceptance Criteria For "Strong Mother"

`mother` should not be considered strong until it can pass these checks:

- Given a domain request, it produces a research brief and candidate source
  list before proposing a Role design.
- Given multiple candidate sources, it scores and rejects weak candidates with
  explicit reasons.
- Given a local external source tree, it inventories and classifies content
  before writing.
- Given a multi-agent workflow, it makes an explicit single-role,
  multi-role, or topology-recipe decision.
- Given an accepted blueprint, it scaffolds a Role with coherent
  `role.toml`, `README.md`, `memory.md`, skills/references/tools, adapter
  notes, provenance, and tests.
- Given a draft Role, it can run or specify concrete validation and report
  blocker/major/minor/suggestion findings.
- It treats research evidence, candidate scorecard, Role blueprint, and
  evaluation report as concrete artifacts, not optional prose.
- It never writes secrets, provider sessions, runtime state, project-private
  task progress, or host-generated projection output into Role source.

## Risks

- Web research can become noisy and shallow. Mitigation: require a research
  brief, source-authority ranking, and candidate scorecard.
- Search results can drift over time. Mitigation: record access date, source
  URL/ref, and confidence.
- A Role can copy too much of an upstream project. Mitigation: classify source,
  carry only justified content, and record provenance/license notes.
- A broad mother skill can bloat context. Mitigation: split into focused
  skills and references with progressive disclosure.
- Deterministic scripts can overreach into crawler or installer behavior.
  Mitigation: keep scripts local, read-only by default, and host-neutral.
