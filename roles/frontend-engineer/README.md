# Frontend Design Engineer

`frontend-engineer` is an experimental Role for designing, implementing,
reviewing, and validating production frontend UI. It combines visual design
judgment, vendored UI/UX Pro Max design intelligence, design-system
discipline, component implementation, accessibility, browser quality checks,
provider-shared runtime setup, optional private MCP tool declarations, and
reviewed Google Antigravity CLI (`agy`) delegation.

## Purpose

Design, implement, review, and validate production frontend UI with strong
visual direction, component discipline, accessibility, responsive behavior,
performance awareness, and browser-based verification.

## Responsibilities

- Turn product requirements, screenshots, Figma context, or existing UI into
  frontend implementation briefs.
- Establish visual direction through layout, typography, color, rhythm, motion,
  density, and state design.
- Use the vendored `ui-ux-pro-max` skill for design-system recommendations,
  palettes, font pairings, UX rules, chart patterns, and stack-specific UI
  guidance.
- Reuse project-local components, Storybook docs, design tokens, and
  design-system conventions before introducing new UI primitives.
- Implement frontend code when asked, following the repository's framework,
  styling, component, and test patterns.
- Validate responsive behavior, accessibility, browser rendering, visual
  polish, and frontend performance risks.
- Run explicit setup checks for optional runtime tools, provider-shared tool
  reuse, project binding, provider bridge projection, repair, and manager-side
  unmount handoff.
- Declare optional MCP and frontend tools through reviewable role-scoped tool
  manifests for compatible Host Adapters.
- Use MCP tools and `agy` delegation only within explicit runtime and review
  boundaries.

## Non-Goals

- Own backend architecture, product strategy, or brand strategy beyond
  frontend implications.
- Override the design-system source of truth without surfacing conflicts.
- Store credentials, Figma files, browser profiles, provider sessions,
  screenshots, AGY worktrees, generated projection output, task progress, or
  runtime state in Role source.
- Treat advisory permissions, MCP examples, or tool notes as actual runtime
  grants.
- Install MCP servers, browser runtimes, or AGY tools silently without explicit
  host or user approval.
- Uninstall role configuration or remove provider/runtime files from inside an
  agent session.
- Copy license-unclear, incompatible, private, or runtime-state skills,
  component libraries, demo source, extracted live-site tokens, screenshots, or
  brand assets into the Role.

## Contents

- `role.toml`: Role Definition with stable identity, contents, advisory
  permissions, and adapter display names.
- `memory.md`: durable frontend design-engineering posture and boundaries.
- `skills/frontend-brief`: product surface, audience, workflow, constraints,
  and acceptance criteria.
- `skills/ui-ux-pro-max`: vendored MIT UI/UX Pro Max skill with design
  intelligence data, search scripts, and templates.
- `skills/visual-direction`: visual quality, anti-generic UI, and state design.
- `skills/design-system-tokens`: design-token, theming, and drift workflow.
- `skills/component-composition`: local component, Storybook, and registry
  composition.
- `skills/figma-to-code`: Figma context to local implementation mapping.
- `skills/responsive-accessibility`: responsive and accessibility review.
- `skills/browser-quality`: Playwright, DevTools, screenshot, and Web Vitals
  validation.
- `skills/role-setup`: explicit runtime setup checks, provider-shared reuse,
  project binding, provider bridge planning, repair handoff, and manager-side
  unmount guidance.
- `skills/agy-frontend-delegate`: bounded `agy` delegation and diff review.
- `skills/demo-kb-curation`: link-only demo and inspiration catalog curation.
- `references/`: long-form design-system, accessibility, browser, MCP, AGY,
  demo-catalog, and vendored-skill provenance guidance.
- `tools/README.md`: tool and MCP runbook with source-boundary cautions.
- `tools/mcp-tools.toml`: optional role-scoped MCP/tool manifest for
  compatible Host Adapters.
- `tools/role_setup.py`: non-mutating setup and diagnostic script for Host
  Adapters and loaded agents; mutation modes require approval and adapter
  ownership.
- `plugins/frontend-mcp-toolbox`: MCP configuration template content that a
  Host Adapter may project into provider-shared runtime or bridge output.
- `adapters/`: host-specific projection and Project Binding notes.
- `tests/validation.md`: validation checklist and behavioral prompts.

## Source Boundary

This Role source is static, reviewable content. Do not store project-specific
task objectives, mounted instance names, progress logs, conversation history,
provider sessions, Figma credentials, browser profiles, AGY worktrees,
screenshots, traces, local ports, or host-generated projection output in this
directory.

Project-specific binding belongs in the host. If a mounted instance needs a
selected Figma file, local dev-server URL, concrete permission grant, AGY
worktree path, or project-specific prompt addition, configure that outside this
Role source.

## Tool Posture

Figma MCP, Storybook MCP, Playwright MCP, Chrome DevTools MCP, shadcn MCP,
Context7, Dembrandt, Style Dictionary, and `agy` are referenced as optional or
project-provided capabilities. This Role now also includes
`tools/mcp-tools.toml`, a machine-readable declaration that compatible Host
Adapters can use to install or project tools into provider-shared managed
runtime after
explicit approval. The `role_setup` skill and `tools/role_setup.py` script
provide a generic setup lifecycle for checking, planning, and handing off
approved apply or repair work to the Host Adapter.

The preferred setup model is provider-shared runtime plus project-private
binding. MCP packages, wrappers, and browser/runtime tools may be installed
once per provider and reused across projects. Project-specific values such as
Storybook URL, local dev-server URL, selected Figma file/frame, and per-project
permissions stay in Project Binding. A provider bridge should load the current
project's binding instead of globally exposing every Role tool.

The manifest is not an installer and not a permission grant. Credentials,
selected Figma files, browser profiles, generated MCP configuration, local
ports, screenshots, traces, package caches, AGY worktrees, and tool logs remain
Project Binding or host runtime state.

The Role directly vendors `ui-ux-pro-max` from
`nextlevelbuilder/ui-ux-pro-max-skill` under `skills/ui-ux-pro-max/`. Its
`scripts/search.py` helper can generate design recommendations from bundled
CSV data. Generated `design-system/` output belongs to the target project or
host runtime, not this Role source.

`role_setup` is not the same as `agent-roles add` or `agent-roles install`.
Adding a Role copies source into the role store; setup runs later inside the
loaded agent/provider. The bundled script should not mutate directly; approved
apply or repair work is handed to the Host Adapter, which owns provider-shared
runtime paths, project bindings, and adapter-owned projection output. Role
config uninstall belongs
to the `agent-roles` or Host Adapter layer that owns Project Binding,
projection records, and mount/unmount state, not to an agent session.

## Naming Note

The canonical Role id is `agentroles.frontend_engineer`. Suggested aliases are
`frontend`, `frontend-engineer`, `frontend-designer`, and `ui-engineer`.
