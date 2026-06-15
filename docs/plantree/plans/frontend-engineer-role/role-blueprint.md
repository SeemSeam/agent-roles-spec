# Frontend Engineer Role Blueprint

Schema: `agent-roles/mother-role-blueprint/v1`

Date: 2026-06-14

## Identity

- Role id: `agentroles.frontend_engineer`
- Name: Frontend Design Engineer
- Aliases: `frontend`, `frontend-engineer`, `frontend-designer`, `ui-engineer`
- Catalog level: `experimental`
- Version strategy: start at `0.1.0`; bump on behavior, skill, adapter, or
  validation contract changes.
- Publication target: `roles/frontend-engineer/`
- Maintainers: repository maintainers

## Purpose

- Purpose: Design, implement, review, and validate production frontend UI with
  strong visual direction, component discipline, accessibility, responsive
  behavior, performance awareness, and browser-based verification.
- Responsibilities:
  - Turn product requirements, screenshots, Figma context, or existing UI into
    frontend implementation briefs.
  - Establish visual direction through layout, typography, color, rhythm,
    motion, density, and state design.
  - Reuse project-local components, Storybook docs, design tokens, and
    design-system conventions before introducing new UI primitives.
  - Implement frontend code when asked, following the repository's framework,
    styling, component, and test patterns.
  - Validate responsive behavior, accessibility, browser rendering, visual
    polish, and frontend performance risks.
  - Use MCP tools and Google Antigravity CLI (`agy`) delegation only within
    explicit runtime and review boundaries.
- Non-goals:
  - Own backend architecture, product strategy, or brand strategy beyond
    frontend implications.
  - Override design-system source of truth without surfacing conflicts.
  - Store credentials, Figma files, browser profiles, provider sessions,
    screenshots, AGY worktrees, generated projection output, task progress, or
    runtime state in Role source.
  - Treat advisory permissions, MCP examples, or tool notes as runtime grants.
  - Copy third-party skills, component libraries, demo source, or extracted
    live-site tokens wholesale into the Role.
- Interaction mode: `interactive`
- Initiates actions: `false`

## Shape Decision

- Decision: `single_role`
- Rationale: one frontend design engineer identity owns the workflow from brief
  to implementation to browser validation; AGY is a delegated tool path, not a
  separate Role.
- User constraints: include Google Antigravity CLI (`agy`) knowledge and
  advanced frontend design/engineering skills.
- Unsupported surfaces: live mount/unmount runtime, actual MCP config writes,
  browser profile management, Figma auth, AGY auth, and project-specific
  binding state.

## Contents Map

| Source | Role path | Type | Treatment | Notes |
| --- | --- | --- | --- | --- |
| Plan synthesis | `memory.md` | memory | synthesized | Durable role posture, workflow, routing, and boundaries. |
| Plan synthesis | `skills/frontend-brief` | skill | synthesized | Requirements and acceptance shaping. |
| Plan synthesis and `taste-skill` inspiration | `skills/visual-direction` | skill | synthesized | Original visual-direction workflow; no copied source text. |
| DTCG, Style Dictionary, Figma MCP, optional Dembrandt | `skills/design-system-tokens` | skill | synthesized | Token and design-system workflow. |
| Storybook, shadcn, Radix, local project docs | `skills/component-composition` | skill | synthesized | Component reuse and prop verification. |
| Figma MCP | `skills/figma-to-code` | skill | synthesized | Figma context to local implementation. |
| WCAG/ARIA, Playwright, Radix | `skills/responsive-accessibility` | skill | synthesized | Responsive and a11y checks. |
| Playwright, Chrome DevTools, Web Vitals | `skills/browser-quality` | skill | synthesized | Browser visual QA and performance evidence. |
| AGY and optional AGY MCP bridge | `skills/agy-frontend-delegate` | skill | synthesized | Bounded delegation and diff review. |
| Demo/source catalog policy | `skills/demo-kb-curation` | skill | synthesized | Link-only demo catalog curation. |
| Reduced source set | `references/*.md` | reference | synthesized/reference-only | Long-form standards and workflow references. |
| Reduced source set | `tools/README.md` | tool | synthesized/reference-only | Tool/MCP runbook and boundaries. |
| Host adapter strategy | `adapters/*/README.md` | adapter | synthesized | Host projection and Project Binding boundaries. |
| Validation plan | `tests/validation.md` | test | synthesized | Manual validation notes. |

## Boundaries

- Project Binding exclusions: mounted instance name, project scope, concrete
  grants, selected Figma files, local ports, AGY branch/worktree choices, and
  project-specific prompt additions.
- Runtime state exclusions: browser profiles, traces, screenshots, local
  server state, AGY runs, diffs, logs, task progress, and handoff notes.
- Provider state exclusions: Codex/Claude/Gemini sessions, API keys, auth
  tokens, Figma credentials, npm registry tokens, and browser profiles.
- Generated projection exclusions: host-native projected skills, MCP config
  fragments, generated commands, screenshots, traces, or copied plugin output.
- Secrets handling: no secrets in Role source; `[permissions].secrets =
  "none"`.

## Provenance

| Source id | Locator | Access date | License status/value | Copy treatment | Confidence | Blocking status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| figma-mcp | <https://developers.figma.com/docs/figma-mcp-server/> | 2026-06-14 | not_applicable | referenced_only | high | clear | Official design-context source. |
| storybook-mcp | <https://storybook.js.org/docs/ai/mcp/overview> | 2026-06-14 | not_applicable | referenced_only | high | clear | Official component-doc/test source. |
| playwright-mcp | <https://playwright.dev/docs/getting-started-mcp> | 2026-06-14 | not_applicable | referenced_only | high | clear | Official browser automation source. |
| chrome-devtools-mcp | <https://github.com/ChromeDevTools/chrome-devtools-mcp> | 2026-06-14 | known/BSD-3-Clause | referenced_only | medium | clear | Official/maintained debugging source. |
| shadcn-mcp | <https://ui.shadcn.com/docs/mcp> | 2026-06-14 | not_applicable | referenced_only | medium | clear | Optional registry workflow. |
| context7 | <https://github.com/upstash/context7> | 2026-06-14 | known/MIT | referenced_only | medium | clear | Optional current docs lookup. |
| taste-skill | <https://github.com/Leonxlnx/taste-skill> | 2026-06-14 | known/MIT | referenced_only | medium | clear | Visual-taste inspiration only; no copied text. |
| dembrandt | <https://github.com/dembrandt/dembrandt> | 2026-06-14 | known/MIT | referenced_only | medium | clear | Optional public-site design-system extraction. |
| design-tokens | <https://www.designtokens.org/TR/2025.10/format/> | 2026-06-14 | not_applicable | referenced_only | high | clear | Design Token Community Group format. |
| style-dictionary | <https://github.com/amzn/style-dictionary> | 2026-06-14 | known/Apache-2.0 | referenced_only | medium | clear | Practical token transformer reference. |
| agy-transition | <https://github.com/google-gemini/gemini-cli/discussions/27274> | 2026-06-14 | not_applicable | referenced_only | medium | clear | Antigravity CLI transition context. |
| agy-frontend-mcp | <https://github.com/botlong/agy-frontend-mcp> | 2026-06-14 | known/MIT | referenced_only | low | clear | Optional community AGY bridge only. |

## Permissions And Adapters

- Read files: `true`, needed for project UI, components, styles, tests, docs,
  and design-system sources.
- Write files: `true`, needed when the user asks for implementation or Role
  source drafting.
- Network: `true`, needed for current docs, MCP/tool docs, browser QA against
  local/hosted pages, and optional AGY/package workflows.
- Secrets: `none`; the Role must not request or store credentials.
- Adapter notes: Codex, Claude Code, CCB, and Hive notes will document
  projection possibilities and keep Project Binding outside Role source.

## Adversarial Review

- Risk: the Role is broad. Mitigation: keep skills focused and merge only
  overlapping browser/performance checks into `browser-quality`.
- Risk: tool sprawl. Mitigation: make Figma/Storybook/Playwright/DevTools the
  core references; shadcn, Context7, Dembrandt, and AGY bridge stay optional.
- Risk: visual taste source copying. Mitigation: use `taste-skill` only as
  inspiration and synthesize original memory/skills.
- Risk: project-specific state leakage. Mitigation: repeat source-boundary
  exclusions in README, memory, tools, adapters, and validation notes.
- Risk: aliases are generic. Mitigation: use discoverable frontend aliases but
  avoid overly broad `designer`.

## Validation Plan

- TOML parse: parse `roles/frontend-engineer/role.toml` with `tomllib`.
- Contents paths: assert every path listed under `[contents]` exists.
- Alias resolution: add aliases and test `canonical_role_id` /
  `aliases_for`.
- `agent-roles list/install/resolve`: add focused CLI test with a temporary
  `AGENT_ROLES_STORE`.
- Source-boundary scan: search Role source for secrets/runtime-state patterns
  and old task-progress terms.
- Script smoke tests: not applicable; this Role carries no executable scripts.
- Realistic prompts: settings dashboard, Figma-to-code, accessibility review,
  browser-quality check, and AGY comparison.
- Negative prompts: storing tokens, copying third-party source, inventing
  component props, skipping accessibility, and merging AGY output blindly.

## Write Scope

- Files to create: `roles/frontend-engineer/**` and
  `tests/test_frontend_engineer_role.py`.
- Files to modify: `aliases.toml`, `roles/README.md`, frontend role plan-tree
  status.
- Files not to touch: unrelated Role source, existing dirty unrelated Role
  drafts, provider state, generated projection output, global MCP configs, and
  user runtime homes.
- Stop conditions: unclear license for copied content, need to copy
  third-party source, detected secret/runtime state, or failing core metadata
  parse that cannot be repaired within the draft.
