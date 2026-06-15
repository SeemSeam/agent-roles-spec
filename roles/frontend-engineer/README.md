# Frontend Design Engineer

`frontend-engineer` is an experimental Role for designing, implementing,
reviewing, and validating production frontend UI. It combines visual design
judgment, design-system discipline, component implementation, accessibility,
browser quality checks, optional private MCP tool declarations, and reviewed
Google Antigravity CLI (`agy`) delegation.

## Purpose

Design, implement, review, and validate production frontend UI with strong
visual direction, component discipline, accessibility, responsive behavior,
performance awareness, and browser-based verification.

## Responsibilities

- Turn product requirements, screenshots, Figma context, or existing UI into
  frontend implementation briefs.
- Establish visual direction through layout, typography, color, rhythm, motion,
  density, and state design.
- Reuse project-local components, Storybook docs, design tokens, and
  design-system conventions before introducing new UI primitives.
- Implement frontend code when asked, following the repository's framework,
  styling, component, and test patterns.
- Validate responsive behavior, accessibility, browser rendering, visual
  polish, and frontend performance risks.
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
- Copy third-party skills, component libraries, demo source, or extracted
  live-site tokens wholesale into the Role.

## Contents

- `role.toml`: Role Definition with stable identity, contents, advisory
  permissions, and adapter display names.
- `memory.md`: durable frontend design-engineering posture and boundaries.
- `skills/frontend-brief`: product surface, audience, workflow, constraints,
  and acceptance criteria.
- `skills/visual-direction`: visual quality, anti-generic UI, and state design.
- `skills/design-system-tokens`: design-token, theming, and drift workflow.
- `skills/component-composition`: local component, Storybook, and registry
  composition.
- `skills/figma-to-code`: Figma context to local implementation mapping.
- `skills/responsive-accessibility`: responsive and accessibility review.
- `skills/browser-quality`: Playwright, DevTools, screenshot, and Web Vitals
  validation.
- `skills/agy-frontend-delegate`: bounded `agy` delegation and diff review.
- `skills/demo-kb-curation`: link-only demo and inspiration catalog curation.
- `references/`: long-form design-system, accessibility, browser, MCP, AGY,
  and demo-catalog guidance.
- `tools/README.md`: tool and MCP runbook with source-boundary cautions.
- `tools/mcp-tools.toml`: optional role-scoped MCP/tool manifest for
  compatible Host Adapters.
- `plugins/frontend-mcp-toolbox`: MCP configuration template content that a
  Host Adapter may project into a private runtime.
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
Adapters can use to install or project tools into a role-private runtime after
explicit approval.

The manifest is not an installer and not a permission grant. Credentials,
selected Figma files, browser profiles, generated MCP configuration, local
ports, screenshots, traces, package caches, AGY worktrees, and tool logs remain
Project Binding or host runtime state.

## Naming Note

The canonical Role id is `agentroles.frontend_engineer`. Suggested aliases are
`frontend`, `frontend-engineer`, `frontend-designer`, and `ui-engineer`.
