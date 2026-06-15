# MCP And AGY Workflows

This reference documents optional frontend tool workflows. It is not runtime
configuration and does not grant permissions.

The Role also includes `tools/mcp-tools.toml` as a role-scoped manifest for
compatible Host Adapters. The manifest is a declaration for optional private
tool projection; it is not an installer and it does not carry credentials.

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
- Prefer role-private runtime paths for installed packages and generated MCP
  config.
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
