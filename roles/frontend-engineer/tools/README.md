# Frontend Tool Notes

This Role documents frontend tool workflows and declares optional private-tool
capabilities. It does not install tools by itself, write global configuration,
or grant runtime permissions.

Machine-readable declarations live in `tools/mcp-tools.toml`. Compatible Host
Adapters may use that manifest to install or project tools into a
provider-shared managed runtime after explicit approval or Project Binding
policy.

The bundled `tools/role_setup.py` script is the role-level setup check
entrypoint. It can check and plan MCP/tool/plugin/provider projection from
inside the loaded provider context. Its default mode is non-mutating.

Prefer the provider-shared runtime model: install MCP packages, wrappers, and
browser/runtime dependencies once per provider, then connect projects through
project-private bindings. A provider bridge should read the current project's
binding and expose only the tools enabled for that project.

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
- Prefer provider-shared managed runtime stores over repeated per-project
  downloads. Keep project-specific URLs, selected design files, and permission
  grants in project binding.
- Store setup ownership and projection records in the agent-roles or Host
  Adapter layer. Role config uninstall should run from that manager layer, not
  from inside the agent.
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
- `role_setup` is broader than MCP: it may also cover plugin projection,
  provider bridge checks, project binding, private wrapper commands,
  diagnostics, repair handoff, and manager-side unmount guidance.
