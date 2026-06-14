# Mother Role Creation And Audit

Date: 2026-06-13

## Purpose

`agentroles.mother` is a preview catalog Role for creating, ingesting, and
auditing Agent Roles. Its job is to help maintainers turn a role idea or
external skill/plugin source into compliant Role source and to review existing
Role source for spec compliance, catalog readiness, practical optimization
opportunities, and skill construction quality.

This Role is intentionally about Role authoring and audit. It is not a runtime
mount supervisor, registry approver, host adapter implementation, or permission
enforcement engine.

## Current Landed Shape

- Canonical id: `agentroles.mother`.
- Role version: `0.2.2`.
- User-facing aliases: `mother`, `role-mother`, `role-author`, and
  `role-auditor`.
- Catalog level: `preview`.
- Advisory permissions: read/write files and bounded network research; no
  secrets.
- Contents:
  - `role.toml` with Role identity, advisory permission posture, and host
    adapter display names.
  - `memory.md` with durable authoring/audit/source-ingestion operating rules.
  - `skills/role-creation-audit/SKILL.md` with creation, audit, repair, and
    explain workflow.
  - `skills/role-source-ingest/SKILL.md` with external source inventory,
    classification, blueprint, write-gate, and validation workflow.
  - `skills/role-research/SKILL.md`, `skills/role-candidate-score/SKILL.md`,
    and `skills/role-blueprint/SKILL.md` with focused research, selection, and
    blueprint-gate workflows.
  - `prompts/role-audit.md` with a reusable structured audit request.
  - `prompts/role-creation.md` with a reusable structured Role creation
    request.
  - `references/skill-construction-research.md` with public source links and
    skill construction plus external-source research principles.
  - `templates/` and `schemas/` with research brief, candidate scorecard, Role
    blueprint, evaluation report, research evidence, candidate scorecard, Role
    blueprint, and evaluation report schema artifacts.
  - `tools/README.md` and `scripts/inventory_external_source.py` with local
    deterministic inventory support for external skill/plugin source trees.
  - `tests/validation.md` with validation expectations.
- Test coverage verifies metadata loading, contents inventory, aliases,
  install/resolve behavior, clean-store list discovery, source-ingest
  instructions, and inventory-script classification.

## Design Position

`mother` should use the semantic strengths of an LLM for role shaping while
being constrained by concrete repository rules:

- read authoritative specs, templates, aliases, and nearby role examples before
  authoring or auditing;
- produce Role source only inside the requested Role directory and related
  catalog files;
- keep Project Binding, runtime state, provider state, task progress, secrets,
  and generated projection output out of Role source;
- lead audits with findings ordered by severity and grounded in file/path
  evidence;
- use bounded web research for public skill-construction tools, examples, and
  techniques when current external guidance materially improves the design;
- prefer official documentation, open standards, and maintained examples, and
  record source URLs/access dates when web research affects Role source;
- require human maintainer review before publication.

The Role may propose source changes or create source when asked, but it should
not claim that advisory permission metadata is an actual runtime grant, and it
must not copy third-party skill examples wholesale.

The next capability target is tracked in
[mother-research-role-design-capability.md](mother-research-role-design-capability.md):
`mother` should become a research-to-role design operator with source
discovery, candidate scoring, blueprint synthesis, deterministic checks, and
evaluation fixtures.

The 2026-06-13 mother self-review tightened that target: evidence, candidate
scorecards, Role blueprints, and evaluation reports must become first-class
templates or schemas before scaffold automation grows.

## 2026-06-12 Runtime Observation

A mounted `mother` session was asked to analyze turning
`Im-Sue/su-ccb-claude-plugin@main` skills into an Agent Role. The session showed
useful research behavior but weak authoring discipline:

- Correct behavior:
  - read local plan-tree context, Role specs, templates, aliases, existing
    Roles, and upstream plugin repositories;
  - identified that the upstream content is a workflow system with Claude-side
    skills, Codex-side execution skills, runtime `lib/`, references,
    templates, hooks, and tests;
  - noticed that SU-CCB is semantically closer to a coordinator/executor
    workflow system than to a single lightweight skill.
- Weak behavior:
  - did not enter a dedicated Role-source ingestion workflow before editing;
  - started copying upstream content into `roles/su-ccb/` before producing a
    blueprint, validation plan, source-boundary decision, or user-visible gate;
  - left an incomplete draft directory with copied assets but no `role.toml`,
    `README.md`, or `memory.md`;
  - did not separate "single Role", "two Roles", and "team/topology recipe"
    decisions into an explicit tradeoff gate after identifying the multi-agent
    nature of the source;
  - relied on ad hoc shell inspection instead of deterministic inventory,
    provenance, dependency, and forbidden-content checks.

The lesson is that `mother` needs stronger behavior constraints and tools for
skill/repository research, packaging, and second-pass optimization. Its core
job is not only to write Role metadata; it should be able to discover relevant
skills, understand their workflow and dependencies, decide whether they belong
in one Role or multiple Roles, and produce a validated Role source plan before
writing.

## Optimization Plan

### P0: Role Source Ingestion Skill

Add a focused `role-source-ingest` skill for converting external skill/plugin
repositories into Agent Role source.

Inputs:

- upstream URL/path/ref and access date;
- intended Role id or domain;
- target host adapters;
- whether the user wants one Role, multiple Roles, or wants `mother` to
  recommend the split;
- publication target: draft, `roles/`, `reference_roles/`, or local-only.

Required workflow:

1. Inventory source before writing:
   - skill count, names, trigger descriptions, reference files, scripts,
     templates/assets, plugin manifests, hooks, tests, package metadata, and
     license/provenance;
   - relative imports from skills to scripts/lib;
   - runtime-writing paths and generated state paths;
   - forbidden files such as credentials, sessions, pid/socket files,
     provider homes, local absolute paths, hidden install records, and task
     progress.
2. Classify content:
   - Role memory;
   - Role skills;
   - Role references;
   - tool/runtime support files;
   - host-native plugin content;
   - adapter notes;
   - Project Binding or runtime state that must not enter Role source.
3. Produce a blueprint gate before edits:
   - canonical Role id and aliases;
   - single-role versus multi-role versus team-recipe decision;
   - contents map;
   - permission posture;
   - provenance/license notes;
   - validation plan;
   - explicit risks and user confirmation points when the source is
     multi-agent or runtime-writing.
4. Only after the blueprint gate, scaffold or patch Role source.

### P0: Write Gate And Draft Safety

Add a hard `mother` rule: do not write into `roles/<id>/` until a blueprint
exists and the intended write scope is clear.

If writing starts, the session must finish in one of these states:

- complete: `role.toml`, `README.md`, `memory.md`, contents inventory, tests,
  and docs are present and validation passes;
- draft: the directory is explicitly labeled as draft/quarantine and final
  output states what remains incomplete;
- rollback: partial files are removed with user consent;
- blocked: the blocker is concrete and the remaining dirty paths are listed.

### P0: Deterministic Research Tools

Add small scripts under the `mother` Role, or later package-manager tooling,
for repeatable external skill analysis:

- `scripts/inventory_external_source.py`: produces JSON inventory of skills,
  references, scripts, manifests, tests, license, package metadata, ignored
  files, and large files.
- `scripts/audit_external_source.py`: scans for forbidden paths, credentials,
  provider/runtime state, local absolute paths, hidden installers, and copied
  marketplace state.
- `scripts/build_role_blueprint.py`: converts inventory plus user intent into
  a draft blueprint with content classification, Role split recommendation, and
  validation checklist.
- `scripts/check_role_draft.py`: verifies generated Role source has required
  files, contents paths exist, TOML parses, aliases resolve when configured,
  and `agent-roles list/install/resolve` can exercise the draft.

These scripts should not fetch secrets, write global config, install plugins,
or mutate user provider homes.

### 2026-06-12 P0 Landing

Landed in `agentroles.mother` `0.2.1`:

- added `skills/role-source-ingest/SKILL.md` for inventory, classification,
  blueprint gate, write gate, and packaging-shape decisions;
- strengthened `memory.md` so external source conversion must inventory and
  blueprint before writing into `roles/<id>/`;
- updated `skills/role-creation-audit/SKILL.md` to route external source work
  through `role-source-ingest`;
- expanded `references/skill-construction-research.md` with external source
  research workflow;
- added `tools/README.md` and `scripts/inventory_external_source.py` for local
  deterministic source-tree inventory;
- updated README/i18n Published Roles content to list `0.2.1` and the new
  source-ingest/inventory capability;
- added test coverage for the new skill inventory and script classification.

### P1: Split Mother's Current Broad Skill

The existing `role-creation-audit` skill is too broad for complex packaging
tasks. Split or extend it with focused workflows:

- `role-intake`: clarify intent, target domain, host adapters, publication
  target, and user constraints.
- `role-source-ingest`: research external skills/plugins/repos and produce
  inventory plus blueprint.
- `role-blueprint`: decide single Role versus multiple Roles versus
  topology/binding recipe.
- `role-scaffold`: generate or patch Role source from a blueprint.
- `role-compliance-audit`: audit completed Role source for spec and catalog
  readiness.
- `role-publish-readiness`: check README/i18n, aliases, catalog level, role
  version, tests, provenance, and update/install behavior.

### P1: Skill Research And Optimization Reference

Expand `references/skill-construction-research.md` from generic best practices
into a research playbook:

- where to search: official host docs, maintained plugin/skill repositories,
  package metadata, release notes, tests, and examples;
- what to extract: trigger metadata, progressive-disclosure structure,
  scripts/assets usage, runtime dependencies, validation examples, and known
  host limitations;
- how to optimize: merge duplicate skills, split over-broad skills, convert
  fragile prose into scripts, move long rules into references, and add
  realistic validation prompts;
- how to report: source URL/ref, access date, license/provenance, confidence
  level, and whether the finding changed Role design.

### P1: Multi-Agent And Team Boundary Rule

When source content implies multiple specialist agents, `mother` must pause and
return a split decision:

- one Role when one specialist identity can own the workflow;
- multiple Roles when coordinator/executor/reviewer duties require different
  skills, providers, permissions, or memory;
- a future team/topology recipe when the desired behavior is an agent network
  rather than one mounted Role;
- an experimental bundle only when the user explicitly accepts that the Role
  is a packaging bridge, not a clean single-agent abstraction.

### P2: Examples And Evaluation Fixtures

Create evaluation prompts and expected outputs for `mother`:

- convert a small skill-only repo into a Role;
- audit an existing Role with one missing contents path;
- ingest a plugin repo with scripts and references but no runtime state;
- analyze a multi-agent plugin and require a split recommendation before
  writing;
- repair an incomplete draft directory left by a previous session.

## MVP Acceptance

- `agent-roles list --json` discovers `agentroles.mother`.
- `agent-roles install mother --json` installs the Role.
- `agent-roles resolve role-author --json` resolves to `agentroles.mother`.
- `role.toml` exposes version `0.2.2`, `network = true`, no secrets,
  creation/audit prompts, source-ingest/research/score/blueprint skills,
  artifact templates, four preview artifact schemas, inventory script, and the
  skill-construction research reference.
- Root and translated README Published Roles sections list `agentroles.mother`.
- `python -m pytest tests/test_mother_role.py` passes.
- Full repository tests pass after the Role is added or renamed.

## Next Improvements

1. Add follow-on deterministic tools after the artifact formats settle:
   `audit_external_source.py`, `score_role_candidates.py`,
   `build_role_blueprint.py`, and `check_role_draft.py`.
2. Add evaluation fixtures and golden examples for weak/noisy sources,
   license-unclear sources, runtime-state repositories, multi-agent workflows,
   and incomplete draft repair.
3. Add richer validation notes for README/i18n synchronization and catalog
   listing behavior.
4. Consider a future `agent-roles new` or `agent-roles scaffold` command only
   after the Role workflow proves repeatable inside `mother`.
5. Promote from `preview` to `stable` only after multiple created/audited Roles
   pass human review and the workflow proves repeatable.

## Risks

- A role-authoring Role can overreach by editing unrelated project files.
  Mitigation: keep source scope explicit and require file/path-specific output.
- It can blur spec rules with host runtime behavior. Mitigation: keep Project
  Binding and host adapter boundaries in memory and audit checks.
- It can create plausible but weak skills. Mitigation: require trigger
  conditions, scoped workflow, forbidden content checks, and validation notes
  for each skill.
- It can start copying external repositories before role boundaries are clear.
  Mitigation: require inventory and blueprint gates before writes.
- It can collapse a multi-agent workflow into one weak Role. Mitigation:
  require an explicit single-role versus multi-role versus team-recipe decision
  before scaffolding.
