---
name: role-setup
description: Check, plan, apply, or repair role-scoped runtime setup for the current mounted Role. Use when the user asks to activate role tools, enable MCP/plugin/provider configuration, run role_setup, inspect isolation, verify private tool installation, or repair projection output. For uninstall or role config removal, route to the agent-roles or Host Adapter unmount lifecycle instead of deleting from inside the agent.
---

# Role Setup

Use this skill to complete or inspect runtime setup after the Role is loaded
inside the active agent/provider environment. This covers MCP declarations,
plugin/template projection, private tool directories, provider config targets,
diagnostics, and repair planning.

Prefer provider-shared runtime plus project-private binding. Reusable MCP
packages, wrappers, and browser/runtime dependencies should be installed once
per provider and reused across projects. Project-specific values such as Figma
file/frame, Storybook URL, local dev-server URL, enabled tools, and permission
choices belong in the current project's binding.

Do not treat Role source installation as runtime setup. `agent-roles add` or
`agent-roles install` copies Role source; `role_setup` checks or prepares
provider/runtime projection after mount.

## Workflow

1. Read `role.toml`, `tools/README.md`, `tools/mcp-tools.toml`, and relevant
   `adapters/<host>/README.md` before planning mutation.
2. Run the bundled script in non-mutating mode first:

   ```bash
   python tools/role_setup.py --mode check --json
   ```

3. If setup is needed, run `--mode plan --json` and summarize:
   provider, provider home, config target, runtime root, required secret names,
   provider-shared runtime reuse, project binding target, provider bridge
   target, project prerequisites, projection outputs, manager lifecycle hints,
   and warnings.
4. Proceed to `apply` or `repair` only when the user approves or Project
   Binding explicitly allows it. Treat this script as a Host Adapter handoff,
   not as the owner of provider config writes.
5. For uninstall or role config removal, tell the user to use the
   agent-roles/Host Adapter unmount lifecycle. Do not delete provider config or
   runtime files from inside the agent session.

## Modes

- `check`: inspect Role manifests, provider hints, current tool availability,
  missing secret names, and project prerequisites. Never mutate files.
- `plan`: print the proposed provider-shared runtime, project binding, and
  projection actions.
  Never mutate files.
- `apply`: emit an approved Host Adapter handoff for setup. Require explicit
  approval unless Project Binding grants it.
- `repair`: emit an approved Host Adapter handoff to recreate missing
  adapter-owned projection output without changing Role source. Require
  approval.

## Isolation Rules

- Prefer provider-shared managed runtime roots and project-private bindings
  over global installs.
- Do not install npm, pip, browser, or MCP packages globally unless the user
  explicitly selects global scope.
- Do not edit `~/.codex/config.toml`, `~/.config/claude/*`, VS Code user MCP
  config, or other global provider config when a narrower provider/project
  target is available.
- Keep credentials, tokens, selected Figma files, browser profiles,
  screenshots, traces, AGY worktrees, package caches, and generated config out
  of Role source.
- Do not perform uninstall inside the agent. Role config uninstall needs the
  manager-side view of Project Binding, mounted instances, projection records,
  and possibly other active windows.
- Do not globally expose every Role MCP server when a provider bridge can load
  the current project's binding and expose only enabled tools.

## Frontend Role Notes

For `agentroles.frontend_engineer`, `role_setup` should inspect optional
Figma, Storybook, Playwright, Chrome DevTools, Context docs, shadcn,
Style Dictionary, and AGY declarations. Missing optional tools should be
reported as capability gaps, not hard failures, unless the current task
requires that tool.
