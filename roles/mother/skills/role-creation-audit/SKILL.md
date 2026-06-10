# Role Creation And Audit

Use this skill when creating a new Agent Role, reviewing an existing Role, or
repairing Role source for spec compliance and catalog readiness.

## Inputs

- Target Role source path or proposed Role id.
- Requested mode: create, audit, repair, or explain.
- Applicable host targets, if any.
- Publication target: local draft, `reference_roles/`, or `roles/` catalog.

## Workflow

1. Establish scope.
   - Confirm whether the task is authoring, auditing, or both.
   - Identify the canonical Role id, expected aliases, catalog level, and host
     adapter targets.
   - Surface naming risks before writing public ids or aliases.
2. Read authoritative context.
   - Check `specs/role-v1.md`, `specs/metadata-v1.md`,
     `specs/host-adapters-v1.md`, `CONTRIBUTING.md`, `aliases.toml`, and
     nearby role examples.
   - Prefer current repository terminology: Role, Role Definition, Host
     Adapter, mount Role, and unmount Role.
3. Create or inspect source.
   - Ensure `role.toml`, `README.md`, and durable role memory exist.
   - Add at least one useful content source such as a skill, prompt, tool note,
     plugin, adapter note, or validation fixture.
   - Keep host-specific behavior in adapter metadata or adapter docs.
4. Audit compliance.
   - Validate metadata shape, semver, timestamps, catalog level, contents
     inventory, aliases, advisory permissions, and adapter hints.
   - Check memory, skills, prompts, tools, plugins, adapters, tests, and README
     files for forbidden content and source/projection boundary drift.
   - Confirm no secrets, provider sessions, runtime pid/socket/lifecycle files,
     conversation logs, task progress, or project-private state are present.
5. Optimize.
   - Tighten purpose, responsibilities, and non-goals.
   - Narrow permissions and clarify whether writes, network, or secrets are
     truly needed.
   - Improve adapter boundaries, unsupported-content behavior, install/update
     notes, cleanup expectations, and validation coverage.
   - Make list/install compatibility explicit with aliases and catalog docs.
6. Verify.
   - Parse all touched TOML.
   - Run focused role tests when available.
   - Run `agent-roles list --json` or the repository's equivalent list command
     with a clean temporary `AGENT_ROLES_STORE`.
   - Run broader tests when the change affects shared catalog behavior.

## Review Output

Lead with findings. For each finding include:

- severity: `blocker`, `major`, `minor`, or `suggestion`;
- file or path reference;
- evidence;
- impact;
- recommended fix.

After findings, include open questions, verification performed, and residual
risks. If no issues are found, state that directly and identify any remaining
test gaps.

## Authoring Output

When creating a Role, report:

- created files;
- canonical id and aliases;
- catalog level and permission posture;
- adapter boundary decisions;
- verification commands and results;
- naming concerns or publication risks.
