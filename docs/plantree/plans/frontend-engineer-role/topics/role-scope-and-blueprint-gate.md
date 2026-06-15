# Role Scope And Blueprint Gate

Date: 2026-06-14

## Purpose

Define the planned Role boundary before writing source under `roles/<id>/`.

## Candidate Identity

- Role id: `agentroles.frontend_engineer` pending naming decision.
- Name: Frontend Design Engineer.
- Catalog level: `experimental` for initial draft.
- Interaction mode: `interactive`.
- Initiates actions: `false` by default; implementation and tool calls happen
  only when requested or when the user asks for an end-to-end frontend change.

## Purpose Statement

Design, implement, review, and validate high-quality frontend interfaces with
strong visual direction, design-system discipline, accessibility, responsive
behavior, performance awareness, and browser-based verification.

## Responsibilities

- Turn product requirements, screenshots, Figma selections, or existing UI into
  clear frontend implementation briefs.
- Establish visual direction through layout, typography, color, rhythm,
  interaction, density, and state design.
- Reuse existing project components, Storybook documentation, design tokens,
  and design-system conventions before inventing new UI primitives.
- Implement frontend code when asked, following the repository's framework,
  component, styling, and test patterns.
- Validate responsive behavior, accessibility, browser rendering, empty/loading
  states, and visual polish.
- Diagnose frontend performance issues, especially Core Web Vitals and heavy
  client-side interaction paths.
- Use MCP servers and `agy` delegation only within explicit runtime boundaries.

## Non-Goals

- Own backend architecture, product strategy, or brand strategy beyond frontend
  implications.
- Override design-system source of truth when Figma, Storybook, tokens, or
  local component docs disagree without surfacing the conflict.
- Store credentials, browser profiles, Figma files, provider sessions,
  screenshots, generated projection output, `agy` state, or task progress in
  Role source.
- Treat advisory permissions or MCP config examples as actual runtime grants.
- Copy third-party skill, component, or demo source wholesale into the Role.

## Planned Contents Map

| Role content | Planned path | Treatment | Notes |
| --- | --- | --- | --- |
| Durable instructions | `memory.md` | synthesized | Working style, design standards, validation posture, boundaries. |
| Frontend brief skill | `skills/frontend-brief` | synthesized | Requirement shaping and acceptance criteria. |
| Visual direction skill | `skills/visual-direction` | synthesized | Distinct UI direction without generic templates. |
| Component composition skill | `skills/component-composition` | synthesized | Storybook/shadcn/local component reuse and prop verification. |
| Figma-to-code skill | `skills/figma-to-code` | synthesized | Use Figma MCP context without copying private design state. |
| Responsive/accessibility skill | `skills/responsive-accessibility` | synthesized | WCAG, ARIA APG, keyboard, focus, reflow, contrast checks. |
| Browser quality skill | `skills/browser-quality` | synthesized | Playwright, Chrome DevTools, screenshots, viewport checks, nonblank/collision checks, and LCP/INP/CLS debugging. |
| AGY delegation skill | `skills/agy-frontend-delegate` | synthesized | Optional `agy` worktree/diff review workflow. |
| References | `references/*.md` | synthesized/reference-only | Design tokens, accessibility, Web Vitals, MCP, demo catalog. |
| Tools notes | `tools/README.md` | synthesized | MCP setup examples and runtime cautions, not installers. |
| Adapter notes | `adapters/*/README.md` | synthesized | Codex, Claude Code, CCB, Hive display and projection behavior. |
| Validation | `tests/validation.md` | synthesized | Prompt evals, metadata checks, source-boundary checks. |

## Permission Posture

- `read_files = true`: needed to inspect project UI, components, styles, tests,
  docs, and design-system source.
- `write_files = true`: needed when the user asks for frontend implementation
  or Role source drafting.
- `network = true`: needed for current frontend docs, MCP/tool docs, browser
  QA against local or hosted pages, and optional `agy`/package workflows.
- `secrets = "none"`: the Role must not request or store credentials.

These fields are advisory metadata only. Project-specific grants belong to
Project Binding or host runtime configuration.

## Boundary Rules

- Role source may document MCP servers, but concrete `.mcp.json`,
  `~/.codex/config.toml`, Antigravity `mcp_config.json`, auth tokens, browser
  profiles, and project registry credentials remain outside Role source.
- `agy` worktrees, branches, summaries, stderr logs, generated diffs, and
  temporary state are runtime artifacts.
- Demo knowledge is link/tag/reference metadata unless license and user intent
  clearly allow carrying source content.
- Any copied third-party content requires provenance and license review before
  entering Role source.

## Blueprint Gate

Before source is written, produce a Role blueprint with:

- canonical id, aliases, catalog level, version strategy, and maintainers;
- final responsibility and non-goal wording;
- contents inventory and excluded material;
- MCP and `agy` treatment;
- provenance table with source authority, license status, and copy treatment;
- validation plan and negative prompts;
- explicit write scope and stop conditions.
