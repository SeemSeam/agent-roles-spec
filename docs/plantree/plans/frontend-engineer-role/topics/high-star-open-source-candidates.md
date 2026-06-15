# Curated Open-Source Candidate Set

Date: 2026-06-14

## Purpose

Record the reduced candidate set for the frontend engineer Role after removing
overlapping high-star tools, design skills, MCP wrappers, and component-library
references.

This file is the current source-selection gate for the Role blueprint. It keeps
only the best representative sources per capability area and moves redundant
sources to a rejected/watchlist section. Role source should synthesize original
skills and references; external source content remains referenced-only unless a
later license/provenance review explicitly permits copying.

## Selection Rules

- Prefer official sources over community wrappers.
- Prefer project-local components and design tokens over new UI libraries.
- Prefer one default tool per workflow, with one fallback only when it covers a
  different failure mode.
- Keep community agent skills as inspiration, not vendored Role content.
- Keep `agy` delegation direct and reviewable; MCP bridges are optional, not
  required.
- Treat stars as adoption signal, not authority.

## Recommended Core Stack

| Capability | Primary source | Secondary source | Keep because |
| --- | --- | --- | --- |
| Visual taste / anti-generic UI constraints | `Leonxlnx/taste-skill` | none | Highest observed signal among agent-facing frontend design skills; useful as inspiration for the Role's `visual-direction` skill. |
| Design context | Figma MCP Server docs | none | Official source for Figma context; project auth, file selection, and write-back policy stay outside Role source. |
| Component inventory and examples | Storybook MCP docs | Storybook Showcase | Official component docs/test surface; avoids inventing component props and supports local component reuse. |
| Browser interaction QA | Playwright MCP docs | none | Official browser automation and accessibility snapshot source; best default for viewport, interaction, and smoke validation. |
| Browser debugging and performance | Chrome DevTools MCP repo | web.dev Core Web Vitals docs | DevTools covers console/network/performance traces; Web Vitals gives the performance vocabulary. |
| Component acquisition for React/Tailwind projects | shadcn MCP docs | Radix UI Primitives docs | shadcn gives registry workflow; Radix gives accessible primitive behavior. Use only when compatible with project stack. |
| Current library/API lookup | Context7 | official library docs | Useful anti-staleness tool, but official docs remain preferred for final claims. |
| Design-system extraction from public websites | `dembrandt/dembrandt` | none | Strongest observed signal among inspected extraction tools; optional for public-site audit only. |
| AGY delegation | Google Antigravity CLI (`agy`) | `botlong/agy-frontend-mcp` | Direct `agy` workflow is the clean default; MCP bridge is low-star community tooling and should remain optional. |
| Token transformation | Design Tokens Community Group format | Style Dictionary | DTCG is the standard reference; Style Dictionary is the practical transformer reference. |

## Role Skill Implications

The external source set supports these internal Role skills:

| Role skill | External source inputs | Decision |
| --- | --- | --- |
| `frontend-brief` | none required | Keep fully synthesized from Agent Roles and frontend practice. |
| `visual-direction` | `taste-skill`, demo catalog, project UI | Keep as original Role skill; cite `taste-skill` only as inspiration. |
| `design-system-tokens` | Figma MCP, DTCG, Style Dictionary, optional `dembrandt` | Keep; avoid copying extracted tokens into Role source. |
| `component-composition` | Storybook MCP, shadcn MCP, Radix docs, local project docs | Keep; prefer local components first. |
| `figma-to-code` | Figma MCP, local component inventory | Keep; no private Figma state in Role source. |
| `responsive-accessibility` | Playwright MCP, Radix docs, ARIA/WCAG references | Keep; browser evidence required for nontrivial UI. |
| `browser-quality` | Playwright MCP, Chrome DevTools MCP, Web Vitals | Merge visual QA and performance into one verification skill to reduce overlap. |
| `agy-frontend-delegate` | direct `agy`, optional `agy-frontend-mcp` | Keep; output is reviewed diff, never automatic merge. |
| `demo-kb-curation` | Storybook Showcase, selected component docs, project examples | Keep as link-only catalog policy. |

## Rejected Or Watchlist Sources

| Source | Status | Reason |
| --- | --- | --- |
| `waybarrios/opencode-power-pack` | reject for active set | Host-port collection overlaps with direct Role skill design; useful only if OpenCode adapter becomes a target. |
| `wilwaldon/Claude-Code-Frontend-Design-Toolkit` | watchlist | Good curated inventory, but overlaps with the chosen core stack and is Claude-specific. |
| `helloianneo/awesome-claude-code-skills` | reject for active set | Discovery index, not an authoritative design source. |
| `mistyhx/frontend-design-audit` | reject for active set | Audit concerns are covered by `browser-quality`, accessibility, and visual-direction validation. |
| `arvindrk/extract-design-system` | watchlist | Similar to `dembrandt`; lower observed signal. Reconsider only if its agent-skill packaging proves useful. |
| `MariusYvard/NullToHero` | reject for active set | Whole-site bundle is broader than this Role and overlaps with brief/design/QA skills. |
| `MickeyAlton33/web-designer-plugin` | reject for active set | Pattern collection overlaps with `taste-skill` and demo catalog. |
| `Ilm-Alan/frontend-design` | reject for active set | Cross-host skill wording is useful, but active set already covers visual skill and host portability. |
| `feature-sliced/skills` | watchlist | Useful for frontend architecture reviews, but not central to first frontend design Role. |
| `pghoshal/design-system-mcp` | reject for active set | Low adoption signal and overlaps with Figma/Storybook/design-token sources. |
| Large UI library list: MUI, Ant Design, Chakra UI, Mantine, Fluent UI, Polaris, Carbon, Semi Design, Arco Design, Naive UI, PrimeReact/PrimeNG | reference only when project uses them | Too many equivalent component libraries. The Role should inspect the target project's existing library instead of recommending a default. |
| Onlook | watchlist | Interesting high-star AI visual editor, but not needed for Role v0.1 and may add workflow overlap with Figma/AGY. |
| Builder.io design-to-code tooling | watchlist | Relevant design-to-code ideas, but not required for the first blueprint. |
| Magic UI, Lobe UI, Vercel AI Elements | demo-only | Useful inspiration for AI/product UI surfaces; do not treat as core dependencies. |

## Blueprint Input

For the Role blueprint, include only these external sources in the primary
provenance table:

- Figma MCP Server docs
- Storybook MCP docs
- Playwright MCP docs
- Chrome DevTools MCP repo
- shadcn MCP docs
- Context7
- `Leonxlnx/taste-skill`
- `dembrandt/dembrandt`
- Design Tokens Community Group format
- Style Dictionary
- Google Antigravity CLI (`agy`) docs or transition notes
- `botlong/agy-frontend-mcp` as optional bridge only

Everything else belongs in a watchlist or demo/reference appendix, not the
first Role contents map.
