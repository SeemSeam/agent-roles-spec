# Agent Roles Spec Plan Tree

Date: 2026-06-02

## Purpose

This is the planning entrypoint for durable Agent Roles Spec planning material.
Use it when resuming roadmap, specification, repository-structure, release, or
host-adapter work.

## Authority Order

1. Published repository files such as `README.md`, `specs/`, `schemas/`,
   `templates/`, and `reference_roles/` are the current source artifacts.
2. Registered plan roots under `docs/plantree/plans/` capture durable planning
   state and handoff context.
3. `implementation-status.md` files are operational handoff notes and must not
   override stable decisions or shipped repository files.
4. Migration notes preserve source context when planning material was copied
   from another repository.

## Baseline

- [baseline/README.md](baseline/README.md) is a lightweight placeholder for
  project-wide baseline notes.

## Active Plans

| Plan | Status | Scope |
| :--- | :--- | :--- |
| [agent-roles-open-source](plans/agent-roles-open-source/README.md) | In progress | Public `agent-roles-spec` GitHub project as a spec-first Agent Roles standard with templates, reference roles, and future host adapters. |

## Migration Notes

- `plans/agent-roles-open-source/` was migrated from
  `/home/bfly/yunwei/ccb_source/docs/plantree/plans/agent-roles-open-source`
  on 2026-06-02.
- Some migrated files still use older `RolePack` terminology. The current
  handoff in
  [plans/agent-roles-open-source/implementation-status.md](plans/agent-roles-open-source/implementation-status.md)
  records the latest naming direction.

## How To Read

Start with the active plan root README, then read `implementation-status.md` for
the latest handoff, then `roadmap.md` and the linked topic or decision files.
