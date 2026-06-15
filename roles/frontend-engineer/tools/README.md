# Frontend Tool Notes

This Role documents frontend tool workflows and declares optional private-tool
capabilities. It does not install tools by itself, write global configuration,
or grant runtime permissions.

Machine-readable declarations live in `tools/mcp-tools.toml`. Compatible Host
Adapters may use that manifest to install or project tools into a
role-private runtime after explicit approval or Project Binding policy.

## Core Tool References

- Figma MCP for design context.
- Storybook MCP for component docs and stories.
- Playwright MCP for browser interaction and accessibility snapshots.
- Chrome DevTools MCP for console, network, screenshots, and performance
  traces.

## Optional Tool References

- shadcn MCP for compatible React/Tailwind registry workflows.
- Context7 for current library documentation lookup.
- Dembrandt or similar public-site design-system extraction tools for runtime
  audit evidence.
- Style Dictionary for projects that transform design tokens.
- Google Antigravity CLI (`agy`) for bounded frontend implementation
  delegation.

## Private Runtime Policy

- Install tools only through explicit host action, user approval, or Project
  Binding policy.
- Prefer role-private or project-private runtime stores over global user
  installation.
- Keep generated MCP config, package caches, browser profiles, screenshots,
  traces, AGY worktrees, and logs out of Role source.
- Treat `plugins/frontend-mcp-toolbox/mcp.json.template` as projection input,
  not a runtime config file.
- If a Host Adapter does not support `contents.tool_manifests`, continue with
  documented tool guidance and report unavailable tools when needed.

## Boundaries

- MCP server config files, auth tokens, browser profiles, local ports, registry
  credentials, selected Figma files, and AGY account state are Project Binding
  or host runtime concerns.
- Tool outputs such as screenshots, traces, logs, generated diffs, and
  extracted tokens are runtime artifacts and must not be committed to Role
  source.
- Hidden installers in memory or prompts are forbidden. Installation and
  update behavior must be explicit in host/project documentation.
