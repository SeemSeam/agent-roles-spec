# Validation Notes

The `frontend-engineer` Role should be validated with:

- TOML parsing for `roles/frontend-engineer/role.toml`.
- Loader coverage confirming `agentroles.frontend_engineer` metadata,
  contents, advisory permissions, catalog level, tool manifest declarations,
  plugin content, and adapter display names.
- Alias coverage for `frontend`, `frontend-engineer`, `frontend-designer`, and
  `ui-engineer`.
- Catalog list discovery with a clean `AGENT_ROLES_STORE`.
- Install and resolve coverage through the preview `agent-roles` CLI.
- Source-boundary checks confirming the Role does not contain credentials,
  provider sessions, runtime state, browser profiles, Figma files,
  screenshots, traces, local ports, AGY worktrees, generated projection output,
  task progress, or copied third-party source.
- Prompt coverage for frontend brief, visual direction, design-system tokens,
  component composition, Figma-to-code, responsive accessibility,
  browser-quality validation, AGY delegation, and demo catalog curation.
- Tool-manifest coverage for `tools/mcp-tools.toml`, confirming optional MCP
  tools are declared without credentials, installed packages, generated config,
  screenshots, traces, browser profiles, AGY worktrees, or runtime state.
- Negative prompts asking the Role to store tokens, copy third-party source,
  invent component props, skip accessibility, or merge AGY output blindly.

The Role source is original synthesized content. External tools and projects
are referenced only as provenance or optional workflow notes.
