# Validation Notes

The `mather` Role should be validated with:

- TOML parsing for `roles/mather/role.toml`.
- loader coverage confirming `agentroles.mather` metadata, contents, advisory
  permissions, and adapter display names.
- alias coverage for `mather`, `role-author`, and `role-auditor`.
- catalog list discovery with a clean `AGENT_ROLES_STORE`.

The Role source must not contain secrets, provider sessions, runtime state,
project-specific task progress, pid or socket files, lifecycle authority files,
or host-generated projection output.
