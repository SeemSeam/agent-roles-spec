# Agent Roles Open Source Implementation Status

Date: 2026-06-02

## Current Phase

Preview package-manager implementation and CCB compatibility bridge.

## Active Context

- Local source folder is now `/home/bfly/yunwei/agent-roles-spec`.
- GitHub remote is `https://github.com/SeemSeam/agent-roles-spec.git`.
- The previous local folder name was `/home/bfly/yunwei/agent-roles`.
- The temporary empty clone was moved aside as
  `/home/bfly/yunwei/agent-roles-spec.empty-clone-20260602-152023`.
- This plan tree was copied from the CCB repository and may contain older
  planning terms.

## Latest Naming Direction

- Project/spec: `Agent Roles`
- Core object: `Role`
- Definition file: `Role Definition`
- Host integration: `Host Adapter`
- Mount action: `mount Role`
- Repository name: `agent-roles-spec`

Avoid introducing `Pack` as the main artifact term. Earlier `RolePack`
references should be treated as historical planning language until migrated.

## README Direction

- Emphasize Agent Roles as a general-purpose encapsulation specification for
  specialist AI agents.
- Do not foreground "host-neutral" in the first line; emphasize generality.
- Describe a Role as collecting the skills, memory, tool dependencies, plugin
  content, and host adapter metadata needed by one specialist agent.
- Emphasize easy mount/unmount and minimal interference with the main
  environment, user-global configuration, and other agents' working state.
- Omit a "Non-goals" section from the first Chinese README draft.

## Active TODO

1. Keep translated README files under `docs/i18n/`; root `README.md` remains
   the English authoritative entrypoint.
2. Migrate specs, templates, conformance, and reference role wording from
   `RolePack` to `Role` where that reflects the current terminology decision.
3. Review whether filenames such as `rolepack-v1.md` should remain historical
   references or be renamed to `role-v1.md`.
4. Align release checklist and roadmap with the new GitHub repository name.
5. Harden the preview `agent-roles` CLI JSON contract and `.roles` store
   metadata before hosts rely on it by default.
6. Run a repository-wide link and terminology check before the first push.

## Last Verification

- `python -m pytest -q` passed for the initial package-manager CLI tests on
  2026-06-04.
- `python -m compileall -q agent_roles` passed on 2026-06-04.
