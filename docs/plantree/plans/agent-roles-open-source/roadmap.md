# Agent Roles Open Source Roadmap

Date: 2026-06-02

## Done

- Chose `Agent Roles` as the public project name, with `agent-roles` as the
  likely repository and CLI name.
- Chose `RolePack` as the main package artifact.
- Later narrowed the public repository name to `agent-roles-spec` and the core
  object terminology to `Role`; older `RolePack` wording now needs migration.
- Established the message pair:
  - For developers: from skills development to roles development.
  - For users: from scattered skills/plugins management to managed roles.
- Decided that Claude Code plugins, Codex plugins, and other host-native plugin
  content may be included inside concrete role packages, but the core project
  remains host-neutral.
- Decided the new project should publish the specification first, then build
  role management, CLI, mount/unmount, and host compatibility work later.
- Started the first executable `agent-roles` package-management slice for
  `.roles` list/install/update/sync/doctor/resolve with JSON output. See
  [topics/package-manager-and-roles-store.md](topics/package-manager-and-roles-store.md).

## In Progress

- Harden the preview package-management CLI while continuing the public README,
  repository structure, and v0.1 release requirement cleanup.

## Next

1. Draft the initial GitHub `README.md` from
   [topics/readme-narrative.md](topics/readme-narrative.md).
2. Draft `specs/rolepack-v1.md` and `specs/metadata-v1.md` from
   [topics/rolepack-content-boundary.md](topics/rolepack-content-boundary.md).
3. Draft `CONTRIBUTING.md` with the role contribution quality gate from
   [first-release-requirements.md](first-release-requirements.md).
4. Create starter templates:
   - basic role
   - role with skills
   - role with tools
   - role with plugin content
5. Create at least one reference role that demonstrates memory, skills, tools,
   and host adapter metadata without depending on CCB internals.
6. Add a lightweight validator or validation checklist for the v0.1 preview.
7. Add CCB compatibility tests for reading `.roles/installed` and resolving
   legacy aliases through the preview package manager.
8. Publish `v0.1.0-spec-preview` only when the first-release checklist passes.

## Deferred

- Role registry or marketplace.
- Signed packages and publisher ownership verification.
- Full CLI `mount` / `unmount` runtime.
- Complete host compatibility harnesses.
- Automatic hot reload across all hosts.
- Permission enforcement beyond declarations and adapter guidance.
- Dependency solving across conflicting tools or plugin content.
- Multi-role composition on one mounted agent instance.
