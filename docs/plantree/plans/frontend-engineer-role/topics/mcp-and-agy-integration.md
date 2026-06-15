# MCP And AGY Integration

Date: 2026-06-14

## Purpose

Define how the planned Role should reason about frontend MCP servers and Google
Antigravity CLI (`agy`) without turning project-specific runtime configuration
into Role source.

## MCP Capability Map

| Tool surface | Role use | Treatment |
| --- | --- | --- |
| Figma MCP | Read design context, variables, components, layout, and selected frames; optionally write native Figma content when project policy permits. | Recommended tool reference. Project auth and file selection stay outside Role source. |
| Storybook MCP | Read component docs and stories, verify props, generate stories, run relevant component/accessibility tests. | Recommended where Storybook exists. Note current framework/support limits in tool docs. |
| Playwright MCP | Navigate running UI, inspect accessibility snapshots, interact with controls, verify flows and responsive behavior. | Recommended browser QA tool. |
| Chrome DevTools MCP | Inspect console, network, screenshots, performance traces, and Core Web Vitals evidence. | Recommended escalation path for debugging and performance. Requires privacy/telemetry caution. |
| shadcn MCP | Browse/search/install registry components and private registries when configured. | Optional only for React/Tailwind or compatible shadcn registry projects. Must respect local design system and auth boundaries. |
| Context/docs MCP | Fetch current library/API docs for React, Next.js, Tailwind, Storybook, animation, testing, and build tooling. | Optional anti-staleness tool. Prefer official docs when available. |
| `agy-frontend-mcp` or equivalent | Delegate a frontend task to Antigravity CLI in an isolated worktree and inspect the resulting diff. | Optional bridge only. Direct `agy` delegation remains the default model. |

## Reduced Tool Policy

- Figma, Storybook, Playwright, and Chrome DevTools are the recommended core
  tool references because they cover design source, component source, browser
  interaction, and browser debugging without adding overlapping UI libraries.
- shadcn MCP is optional and stack-dependent. Do not make it a default when the
  target project already uses MUI, Ant Design, Chakra, Mantine, Carbon, or a
  private design system.
- Context7 is optional and should support current API lookup, not replace
  official docs.
- `agy-frontend-mcp` is not a core dependency. Use it only when the host wants
  MCP-based Antigravity delegation; otherwise document direct `agy` usage.

## Provider-Shared Tool Manifest

The 2026-06-15 upgrade chooses a self-describing but source-safe model:

- Role source may contain `tools/mcp-tools.toml` as a machine-readable manifest.
- Role source may contain `plugins/frontend-mcp-toolbox/` with MCP config
  templates or wrapper source that Host Adapters can project.
- Reusable MCP packages, wrappers, and browser/runtime dependencies should use
  provider-shared managed runtime so another project using the same provider
  does not redownload tools.
- Project-specific selected Figma files/frames, Storybook URLs, local dev
  server URLs, enabled tools, and permission choices stay in Project Binding.
- Provider config should prefer one agent-roles bridge/router that reads the
  current project binding instead of globally exposing every frontend MCP
  server.
- Runtime installs, generated MCP config, tokens, browser profiles, selected
  Figma files, screenshots, traces, package caches, AGY worktrees, and logs
  stay outside Role source.
- Compatible Host Adapters may install or project declared tools into a
  provider-shared runtime only through explicit host action, user approval, or
  Project Binding policy.
- Hosts that do not support tool manifests fall back to the human-readable
  tool runbook and should report missing capabilities clearly.

## `role_setup` Runtime Setup

The frontend Role should eventually carry a reusable setup entrypoint:

- skill path: `skills/role-setup/SKILL.md`;
- user-facing trigger alias: `role_setup`;
- optional script: `tools/role_setup.py` or `tools/role_setup.mjs`;
- default mode: `check` or `plan`;
- mutation modes: `apply` and `repair`, only with explicit approval or Project
  Binding policy.

This setup runs after the Role is loaded inside the current agent/provider
window, because only that environment can reliably identify whether MCP config
belongs to Codex global config, CCB provider-state Codex config, Claude project
config, VS Code MCP config, or another Host Adapter surface.

The setup must not write to `~/.codex/config.toml`, `~/.config/claude/*`, or
any global package manager location directly. The preferred target is a
provider-shared runtime plus project-private binding and adapter-owned provider
bridge projection.

`role_setup` is intentionally broader than MCP. It may also cover plugin
projection, private wrapper commands, browser runtime checks, AGY availability
checks, and repair handoff for adapter-owned projection output. Role config
uninstall must not run inside the agent; it belongs to the `agent-roles` or
Host Adapter manager layer that owns Project Binding and projection records.

## AGY Delegation Model

Use `agy` only when delegation improves frontend work:

1. Prepare a bounded frontend task brief with repo path, target files or
   surfaces, constraints, acceptance criteria, and forbidden changes.
2. Delegate into an isolated worktree or equivalent sandbox.
3. Treat success as a reviewed diff, not a process exit code or agent summary.
4. Inspect changed files, diffstat, tests, screenshots, and runtime behavior.
5. Merge only when the user asks for merge or the host workflow has explicit
   approval. Otherwise summarize and discard or leave for review.

## AGY Boundaries

- `agy` login, account tier, local keyring, Antigravity config, and quota are
  host/user runtime concerns.
- `agy` can be documented as a recommended companion tool, but Role source must
  not contain its provider state, conversations, worktrees, generated branches,
  temporary directories, or auth data.
- Delegation should not bypass repository tests, browser checks, code review,
  accessibility review, or source-boundary rules.
- If `agy` and the primary agent disagree, prefer concrete evidence: diff,
  tests, browser screenshots, accessibility snapshots, traces, and project
  conventions.

## Adapter Notes To Carry Later

- Codex: document MCP examples and role-scoped instructions; do not write
  `~/.codex/config.toml` from Role source.
- Claude Code: document plugin/skill/MCP projection possibilities; keep
  project `.mcp.json` as Project Binding.
- CCB: treat `ask` and multi-agent coordination as host-owned runtime behavior,
  not part of the core Role.
- Hive: provide capability-profile notes only until Hive adapter behavior is
  concrete.

## Evidence To Preserve In Blueprint

- Source authority and maintenance status for each MCP/tool reference.
- License and copy treatment: referenced-only by default.
- Known risks: secrets exposure, browser profile exposure, private registry
  credentials, telemetry, weak community-maintenance signal, and generated
  runtime state.

## Inspected Source Notes

Access date: 2026-06-14.

| Source | Authority | Locator | Design impact |
| --- | --- | --- | --- |
| Figma MCP Server docs | official | <https://developers.figma.com/docs/figma-mcp-server/> | Recommended design-context source; auth and selected files stay outside Role source. |
| Storybook MCP docs | official | <https://storybook.js.org/docs/ai/mcp/overview> | Recommended component-doc/test source where supported; note preview/support limits. |
| Playwright MCP docs | official | <https://playwright.dev/docs/getting-started-mcp> | Recommended browser automation and accessibility snapshot source. |
| Chrome DevTools MCP repo | official/maintained | <https://github.com/ChromeDevTools/chrome-devtools-mcp> | Recommended debugging/performance source with privacy and telemetry cautions. |
| shadcn MCP docs | maintained | <https://ui.shadcn.com/docs/mcp> | Optional registry/component acquisition source. |
| Context7 repo | maintained | <https://github.com/upstash/context7> | Optional current library documentation source. |
| Google Gemini CLI transition discussion | official/maintained | <https://github.com/google-gemini/gemini-cli/discussions/27274> | Confirms Antigravity CLI transition context and `agy` relevance. |
| `agy-frontend-mcp` repo | community | <https://github.com/botlong/agy-frontend-mcp> | Optional delegated frontend worktree/diff workflow; not a hard dependency. |
