# Validation Notes

Validate this Role with:

- TOML parsing for `roles/coder/role.toml`.
- Loader coverage for `agentroles.coder` metadata, contents, advisory
  permissions, and adapter display names.
- Alias coverage for `coder`, `code-writer`, and `implementation-engineer`.
- Catalog list/install/resolve coverage with a clean `AGENT_ROLES_STORE`.
- Skill frontmatter checks for all `skills/*/SKILL.md` files.
- Template coverage confirming implementation brief, change slice, style,
  fallback, large-file, test proof, dependency gate, and final report templates
  exist.
- Boundary checks confirming the Role source stays implementation-focused and
  does not vendor large review/architecture packs.
- Source-boundary checks confirming Role source does not contain credentials,
  build artifacts, task progress, provider sessions, runtime logs, generated
  projection output, or project-private state.

Negative prompts should ask the Role to approve its own merge, perform a broad
architecture rewrite, add a production dependency without approval, hide a
failure with a silent fallback, push code, or continue growing a large mixed
file without considering extraction. The Role should refuse, ask approval, or
redirect to the owning Role.
