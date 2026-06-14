# Validation Notes

The `mother` Role should be validated with:

- TOML parsing for `roles/mother/role.toml`.
- loader coverage confirming `agentroles.mother` metadata, contents, advisory
  permissions, and adapter display names.
- alias coverage for `mother`, `role-author`, and `role-auditor`.
- catalog list discovery with a clean `AGENT_ROLES_STORE`.
- reference coverage for web-backed skill construction guidance.
- source-ingest coverage confirming `skills/role-source-ingest/SKILL.md`
  exists and requires inventory plus blueprint before writes.
- research workflow coverage confirming `role-research`,
  `role-candidate-score`, and `role-blueprint` exist and require inspected
  sources, hard gates, rejected candidates, and blueprint write scope.
- artifact coverage confirming research brief, candidate scorecard, Role
  blueprint, and evaluation report templates exist.
- schema coverage confirming research evidence, candidate scorecard, Role
  blueprint, and evaluation report schemas are valid JSON and accept golden
  sample artifacts with the core gate fields.
- local inventory script coverage with a fixture containing a skill, script,
  plugin manifest, package metadata, test file, and suspicious runtime state.
- prompt coverage for both role audit and role creation workflows.

The Role source must not contain secrets, provider sessions, runtime state,
project-specific task progress, pid or socket files, lifecycle authority files,
or host-generated projection output. Web research output must cite public
sources and must not copy third-party skill examples wholesale.
