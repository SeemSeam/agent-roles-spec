# Validation Notes

The `mother` Role should be validated with:

- TOML parsing for `roles/mother/role.toml`.
- loader coverage confirming `agentroles.mother` metadata, contents, advisory
  permissions, and adapter display names.
- alias coverage for `mother`, `role-author`, and `role-auditor`.
- catalog list discovery with a clean `AGENT_ROLES_STORE`.
- reference coverage for web-backed skill construction guidance.
- prompt coverage for both role audit and role creation workflows.

The Role source must not contain secrets, provider sessions, runtime state,
project-specific task progress, pid or socket files, lifecycle authority files,
or host-generated projection output. Web research output must cite public
sources and must not copy third-party skill examples wholesale.
