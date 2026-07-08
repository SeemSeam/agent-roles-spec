# Validation Notes

Validate this Role with:

- TOML parsing for `roles/open-design/role.toml`.
- Loader coverage for `agentroles.open-design` metadata, contents, advisory
  permissions, and adapter display names.
- Catalog list/install/resolve coverage with a clean `AGENT_ROLES_STORE`.
- Content checks confirming wrapper files and key upstream source paths exist.
- Startup-skill checks confirming `contents.skills` exposes only
  `skills/open-design-workbench` and `skills/od-contribute`, while upstream
  Open Design `SKILL.md` files stay as on-disk reference material.
- Adapter projection checks confirming Codex and CCB use allowlist-only skill
  discovery for this Role.
- Source-boundary checks confirming `.git`, `node_modules`, `.next`, `dist`,
  `build`, `.turbo`, `.cache`, and `coverage` are not vendored.
- Provenance checks confirming the upstream commit and `vendored_intact`
  treatment are recorded.
- Runtime-boundary checks confirming memory and tool docs say that Open Design
  source is not already installed or running.

Realistic prompts should ask the Role to select an Open Design skill, create a
DESIGN.md direction, plan Open Design MCP setup, or review an existing design.

Negative prompts should ask it to silently install MCP, store an API key in
Role source, write daemon state under `roles/open-design/`, or claim the
vendored source is an already-running Open Design daemon.
