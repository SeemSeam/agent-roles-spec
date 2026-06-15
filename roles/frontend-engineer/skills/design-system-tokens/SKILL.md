---
name: design-system-tokens
description: Use for design tokens, theming, light/dark or multi-brand support, token drift, component-system alignment, Figma variables, or Style Dictionary/DTCG token workflows.
---

# Design System Tokens

Use this skill when frontend work touches tokens, themes, component-system
alignment, Figma variables, Tailwind config, CSS variables, or design-system
drift.

## Workflow

1. Identify the token sources: local code, Figma variables, Storybook docs,
   CSS variables, Tailwind config, Style Dictionary, or DTCG-format files.
2. Determine token categories: color, typography, spacing, radius, shadow,
   motion, z-index, breakpoints, and component semantic tokens.
3. Check for drift between design source, code source, and rendered UI.
4. Prefer semantic tokens for product meaning and raw tokens for primitives.
5. Keep extracted public-site tokens as runtime evidence, not Role source.
6. Document migration or implementation steps without overwriting source of
   truth silently.

## Output

Return:

- token source-of-truth assessment
- drift or conflict findings
- recommended token structure
- implementation steps
- validation checks

Do not store private Figma data, public-site extracted tokens, or project token
snapshots in Role source.
