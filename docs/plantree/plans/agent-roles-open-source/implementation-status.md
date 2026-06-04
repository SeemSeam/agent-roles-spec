# Agent Roles Open Source Implementation Status

Date: 2026-06-04

## Current Phase

Preview package-manager hardening and PyPI release preparation.

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
- CLI/package command: `agent-roles`

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
5. Configure PyPI Trusted Publishing for project `agent-roles` using
   `.github/workflows/pypi.yml`, repository `SeemSeam/agent-roles-spec`, and
   GitHub environment `pypi`.
6. Publish the first PyPI preview only after the release workflow succeeds from
   a GitHub Release or approved manual workflow dispatch.
7. Continue hardening host adapter consumption of the preview CLI JSON contract.
8. Decide whether `created_at` / `updated_at` become required for all preview
   roles or remain "required for published catalog roles" guidance until schema
   stabilization.

## Last Verification

- `python -m pytest -q` passed for the initial package-manager CLI tests on
  2026-06-04.
- `python -m compileall -q agent_roles` passed on 2026-06-04.
- `python -m pytest` passed after adding `upgrade`, strict `update`, and
  `--version` behavior on 2026-06-04.
- Temporary release build verification passed on 2026-06-04: copied the working
  tree to a temp source directory, ran tests, built wheel/sdist, ran
  `twine check`, installed the wheel in a temp venv, and verified
  `agent-roles --version` plus `agent-roles list --json`.
- Role revision metadata verification passed on 2026-06-04: all repository
  `role.toml` files include `version`, `created_at`, and `updated_at`; tests,
  compileall, wheel/sdist build, `twine check`, and installed-wheel CLI startup
  passed with timestamp fields present in JSON output.
