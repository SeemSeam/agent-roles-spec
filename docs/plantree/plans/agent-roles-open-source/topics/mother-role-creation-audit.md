# Mother Role Creation And Audit

Date: 2026-06-10

## Purpose

`agentroles.mother` is a preview catalog Role for creating and auditing Agent
Roles. Its job is to help maintainers turn a role idea into compliant Role
source and to review existing Role source for spec compliance, catalog
readiness, practical optimization opportunities, and skill construction quality.

This Role is intentionally about Role authoring and audit. It is not a runtime
mount supervisor, registry approver, host adapter implementation, or permission
enforcement engine.

## Current Landed Shape

- Canonical id: `agentroles.mother`.
- Role version: `0.2.0`.
- User-facing aliases: `mother`, `role-mother`, `role-author`, and
  `role-auditor`.
- Catalog level: `preview`.
- Advisory permissions: read/write files and bounded network research; no
  secrets.
- Contents:
  - `role.toml` with Role identity, advisory permission posture, and host
    adapter display names.
  - `memory.md` with durable authoring/audit operating rules.
  - `skills/role-creation-audit/SKILL.md` with creation, audit, repair, and
    explain workflow.
  - `prompts/role-audit.md` with a reusable structured audit request.
  - `prompts/role-creation.md` with a reusable structured Role creation
    request.
  - `references/skill-construction-research.md` with public source links and
    skill construction principles.
  - `tests/validation.md` with validation expectations.
- Test coverage verifies metadata loading, contents inventory, aliases,
  install/resolve behavior, and clean-store list discovery.

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

## MVP Acceptance

- `agent-roles list --json` discovers `agentroles.mother`.
- `agent-roles install mother --json` installs the Role.
- `agent-roles resolve role-author --json` resolves to `agentroles.mother`.
- `role.toml` exposes version `0.2.0`, `network = true`, no secrets, creation
  and audit prompts, and the skill-construction research reference.
- Root and translated README Published Roles sections list `agentroles.mother`.
- `python -m pytest tests/test_mother_role.py` passes.
- Full repository tests pass after the Role is added or renamed.

## Next Improvements

1. Add a repair workflow example that converts audit findings into a minimal
   patch plan.
2. Add richer validation notes for README/i18n synchronization and catalog
   listing behavior.
3. Consider a future `agent-roles new` or `agent-roles scaffold` command, but
   keep that as package-manager work, not hidden behavior inside Role memory.
4. Promote from `preview` to `stable` only after multiple created/audited Roles
   pass human review and the workflow proves repeatable.

## Risks

- A role-authoring Role can overreach by editing unrelated project files.
  Mitigation: keep source scope explicit and require file/path-specific output.
- It can blur spec rules with host runtime behavior. Mitigation: keep Project
  Binding and host adapter boundaries in memory and audit checks.
- It can create plausible but weak skills. Mitigation: require trigger
  conditions, scoped workflow, forbidden content checks, and validation notes
  for each skill.
