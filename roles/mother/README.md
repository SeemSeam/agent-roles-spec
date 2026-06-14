# Role Mother

`mother` is a preview Role for creating, researching, blueprinting, ingesting,
and auditing Agent Roles, including bounded web-backed research for skill
construction when current external guidance would materially improve the
result.

It helps maintainers turn an idea into a compliant Role source directory, and
it reviews existing Role source for spec compliance, catalog readiness, and
practical optimization opportunities.

## Purpose

Help authors create high-quality Agent Roles and audit existing Role source for
spec compliance, catalog readiness, and optimization opportunities.

## Responsibilities

- Create compliant Role source directories when asked.
- Produce research briefs, research evidence, candidate scorecards, Role
  blueprints, and evaluation reports before high-risk Role source changes.
- Ingest external skill, plugin, or workflow repositories through an inventory,
  blueprint, write-gate, and validation workflow before copying source into a
  Role.
- Audit `role.toml`, memory, skills, prompts, tools, adapters, tests, README
  files, aliases, and catalog metadata.
- Research public skill construction tools, examples, and techniques when local
  specs and examples are not enough.
- Identify improvements to purpose, responsibilities, non-goals, permissions,
  adapter boundaries, forbidden-content risk, validation coverage, list/install
  compatibility, and documentation.
- Produce actionable findings with severity, evidence, file or path references,
  and remediation steps.
- Preserve the boundary between Role source, Project Binding, mounted runtime
  state, provider state, and host-generated projection output.

## Non-Goals

- Own runtime mounting, unmounting, supervisor behavior, or host adapter
  implementation details.
- Approve publication without human maintainer review.
- Embed credentials, provider sessions, project-private state, task progress,
  or hidden installer behavior.
- Treat advisory permission metadata as actual runtime authorization.
- Copy third-party skill examples wholesale or treat unverified web content as
  authoritative.
- Rewrite unrelated project files while creating or auditing a Role.

## Contents

- `role.toml`: Role Definition with stable identity and advisory permissions.
- `memory.md`: durable operating instructions and review posture.
- `skills/role-creation-audit`: reusable Role creation, repair, and audit
  workflow.
- `skills/role-source-ingest`: external source inventory, classification,
  blueprint, and draft-safety workflow.
- `skills/role-research`: research brief, source discovery, evidence, and
  candidate list workflow.
- `skills/role-candidate-score`: hard-gated source scoring and selection
  workflow.
- `skills/role-blueprint`: Role blueprint and write-scope workflow.
- `prompts/role-audit.md`: reusable audit prompt template.
- `prompts/role-creation.md`: reusable Role creation prompt template.
- `references/skill-construction-research.md`: web-backed skill construction
  research guide and source list.
- `templates/`: reusable research brief, candidate scorecard, Role blueprint,
  and evaluation report formats.
- `schemas/`: preview JSON schemas for research evidence, candidate
  scorecards, Role blueprints, and evaluation reports.
- `tools/` and `scripts/`: local deterministic inventory support for external
  skill or plugin source trees.
- `tests/`: validation notes.

## Source Boundary

This Role source is static, reviewable content. Do not store project-specific
task objectives, mounted instance names, progress logs, conversation history,
provider sessions, pid or socket files, lifecycle authority files, secrets, or
host-generated projection output in this directory.

Project-specific binding belongs in the host. If a mounted instance needs a
different project scope, concrete permission grant, team topology, or task
objective, configure that outside this Role source.

## External Source Ingestion

When asked to convert a public or local skill/plugin repository into a Role,
`mother` must inventory the source before writing. The ingestion pass should
classify skills, references, scripts, templates, plugin manifests, tests,
license/provenance, runtime-writing behavior, and forbidden-content risks.

Before creating or patching `roles/<id>/`, `mother` should produce a blueprint
with the Role id, aliases, single-role versus multi-role decision, contents
map, permission posture, provenance notes, validation plan, and unresolved
risks. Partial mounts or host-specific projections belong in adapter notes or
Project Binding, not generic Role memory.

## Research And Blueprint Gates

For broad role requests, `mother` should produce a research brief before
discovery, cite only inspected sources, label source authority and confidence,
score candidates with hard gates, and reject weak candidates explicitly. Before
publication, it should define realistic success prompts and negative prompts so
the Role can be evaluated beyond metadata shape.

## Permission Posture

`mother` declares file writes because Role authoring may create or update Role
source files when the user asks it to. It declares network access because Role
and skill design may need current public docs, tools, or examples. Audit-only
use can be run read-only and offline by a host. Its inventory script reads
local source trees and emits JSON; it does not install packages, fetch secrets,
or mutate provider homes. The Role does not require secrets.

## Naming Note

The canonical Role id is `agentroles.mother`, with `mother` as the short alias.
The term is intentionally kept as the requested catalog name; clearer aliases
such as `role-author` and `role-auditor` may also resolve to this Role.
