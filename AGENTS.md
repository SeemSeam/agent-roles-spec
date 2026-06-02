# Project Agent Memory

This file is the repo-local agent memory anchor for `agent-roles-spec`.

## Planning Anchor

Use [docs/plantree/README.md](docs/plantree/README.md) as the planning
entrypoint.

When resuming Agent Roles Spec work, read:

1. [docs/plantree/README.md](docs/plantree/README.md)
2. [docs/plantree/baseline/README.md](docs/plantree/baseline/README.md)
3. [docs/plantree/plans/agent-roles-open-source/README.md](docs/plantree/plans/agent-roles-open-source/README.md)
4. [docs/plantree/plans/agent-roles-open-source/implementation-status.md](docs/plantree/plans/agent-roles-open-source/implementation-status.md)

## Current Terminology

- Project/spec: `Agent Roles`
- Repository: `agent-roles-spec`
- Core object: `Role`
- Definition file: `Role Definition`
- Host integration: `Host Adapter`
- Mount actions: `mount Role` and `unmount Role`

Avoid introducing `Pack` as the main artifact term. Existing `RolePack`
references may appear in migrated planning material and should be treated as
historical until intentionally migrated.

## Update Discipline

- If public positioning changes, update the README files and the active
  plan-tree handoff in the same patch.
- If core terminology changes, check `README.md`, `README.zh-CN.md`, `specs/`,
  `schemas/`, `templates/`, `reference_roles/`, `conformance/`, `ROADMAP.md`,
  and `RELEASE_CHECKLIST.md`.
- Treat CCB as one possible host adapter, not as the runtime source of this
  public specification.
