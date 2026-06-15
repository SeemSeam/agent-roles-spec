# Design System And Tokens Reference

Use this reference when frontend work touches design systems, tokens, theming,
component APIs, or design/source drift.

## Source Order

1. Project-local source: components, Storybook, tokens, CSS variables, Tailwind
   config, style packages, docs, and tests.
2. Product design source: Figma variables, selected frames, component specs,
   and screenshots supplied by the user or host.
3. Standards and tools: Design Tokens Community Group format, Style
   Dictionary, shadcn registry, Radix behavior docs, and current framework docs.
4. External inspiration: public demos and design-system references, used only
   as link-only guidance.

## Token Checklist

- primitive tokens: color, spacing, typography, radius, shadow, motion,
  z-index, breakpoints;
- semantic tokens: product intent, status, surface, border, text, action,
  feedback, and data state;
- component tokens: component-specific slots and states;
- modes: light, dark, high contrast, reduced motion, density, and brand where
  relevant;
- transformation: source format, generated CSS variables, Tailwind mapping,
  TypeScript exports, and docs.

## Drift Checks

- Does code use hard-coded values where tokens exist?
- Do Figma variables and code tokens use the same naming and semantics?
- Are Storybook examples aligned with production UI?
- Are theme modes complete for interactive and feedback states?
- Are extracted public-site tokens being treated as evidence rather than
  copied source?

Do not silently choose between conflicting Figma, code, and Storybook sources.
Surface the conflict and recommend a source-of-truth decision.
