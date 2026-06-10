# Role Mother

`mother` is a preview Role for creating and auditing Agent Roles.

It helps maintainers turn an idea into a compliant Role source directory, and
it reviews existing Role source for spec compliance, catalog readiness, and
practical optimization opportunities.

## Purpose

Help authors create high-quality Agent Roles and audit existing Role source for
spec compliance, catalog readiness, and optimization opportunities.

## Responsibilities

- Create compliant Role source directories when asked.
- Audit `role.toml`, memory, skills, prompts, tools, adapters, tests, README
  files, aliases, and catalog metadata.
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
- Rewrite unrelated project files while creating or auditing a Role.

## Contents

- `role.toml`: Role Definition with stable identity and advisory permissions.
- `memory.md`: durable operating instructions and review posture.
- `skills/role-creation-audit`: reusable Role creation and audit workflow.
- `prompts/role-audit.md`: reusable audit prompt template.
- `tests/`: validation notes.

## Source Boundary

This Role source is static, reviewable content. Do not store project-specific
task objectives, mounted instance names, progress logs, conversation history,
provider sessions, pid or socket files, lifecycle authority files, secrets, or
host-generated projection output in this directory.

Project-specific binding belongs in the host. If a mounted instance needs a
different project scope, concrete permission grant, team topology, or task
objective, configure that outside this Role source.

## Permission Posture

`mother` declares file writes because Role authoring may create or update Role
source files when the user asks it to. Audit-only use can be run read-only by a
host. The Role does not require network access or secrets.

## Naming Note

The canonical Role id is `agentroles.mother`, with `mother` as the short alias.
The term is intentionally kept as the requested catalog name; clearer aliases
such as `role-author` and `role-auditor` may also resolve to this Role.
