# Validation Notes

The `mother` Role should be validated with:

- TOML parsing for `roles/mother/role.toml`.
- loader coverage confirming `agentroles.mother` metadata, contents, advisory
  permissions, and adapter display names.
- alias coverage for `mother`, `role-author`, and `role-auditor`.
- catalog list discovery with a clean `AGENT_ROLES_STORE`.

The Role source must not contain secrets, provider sessions, runtime state,
project-specific task progress, pid or socket files, lifecycle authority files,
or host-generated projection output.
