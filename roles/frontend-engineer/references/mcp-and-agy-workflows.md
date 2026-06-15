# MCP And AGY Workflows

This reference documents optional frontend tool workflows. It is not runtime
configuration and does not grant permissions.

The Role also includes `tools/mcp-tools.toml` as a role-scoped manifest for
compatible Host Adapters. The manifest is a declaration for optional private
tool projection; it is not an installer and it does not carry credentials. Use
`role_setup` for the broader runtime setup lifecycle when a loaded Role needs
provider-aware checks, projection planning, repair handoff, or manager-side
unmount guidance.

## Recommended Core Tools

- Figma MCP: design context, variables, components, and selected frames.
- Storybook MCP: component docs, stories, props, states, and tests.
- Playwright MCP: browser interaction, accessibility snapshots, and viewport
  validation.
- Chrome DevTools MCP: console, network, screenshot, performance trace, and
  Core Web Vitals evidence.

## Optional Tools

- shadcn MCP: registry and component acquisition for compatible React/Tailwind
  projects.
- Context7: current library/API lookup when official docs need quick access.
- Dembrandt or similar tools: public-site design-system extraction as runtime
  audit evidence, not Role source.
- Style Dictionary: token transformation reference when the project uses it.

## Role-Private Tool Policy

- Treat MCP and AGY tools as optional runtime capabilities.
- Install or project them only through explicit host action, user approval, or
  Project Binding policy.
- Prefer provider-shared managed runtime paths for installed packages and
  wrappers so projects using the same provider do not redownload tools.
- Keep project-specific resources such as Storybook URLs, local dev-server
  URLs, selected Figma files/frames, and permission grants in Project Binding.
- Use a provider bridge to read the current project binding and expose only
  that project's enabled tools.
- Keep setup ownership in agent-roles or Host Adapter projection records so
  role config uninstall can run outside the agent session.
- Keep real tokens, selected Figma files, browser profiles, screenshots,
  traces, AGY worktrees, local dev-server URLs, and tool logs outside Role
  source.
- If the Host Adapter does not support tool manifests, fall back to the
  human-readable tool runbook and report unavailable tools clearly.

## AGY Delegation

Use Google Antigravity CLI (`agy`) only as a bounded delegation path:

1. Write a task brief.
2. Run in an isolated worktree or review boundary.
3. Inspect the resulting diff.
4. Run relevant tests or browser checks.
5. Recommend merge, revise, or discard.

Never treat AGY output as automatically accepted. Do not store AGY auth,
provider state, conversations, worktree paths, branches, logs, or generated
diffs in Role source.

## Configuration Boundary

Concrete MCP configs, auth tokens, selected Figma files, browser profiles,
local ports, registry credentials, and AGY account state belong to Project
Binding or host runtime configuration, not this Role.
