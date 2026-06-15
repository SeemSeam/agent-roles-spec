---
name: figma-to-code
description: Use when Figma context, selected frames, variables, components, or screenshots should be mapped to local frontend implementation without copying private Figma state into Role source.
---

# Figma To Code

Use this skill when Figma context is available through a host or MCP tool and
the user wants implementation or review against that design source.

## Workflow

1. Identify the selected frame or design surface through the host-provided
   Figma context.
2. Extract design intent: layout, hierarchy, tokens, components, variants,
   spacing, responsive behavior, and states.
3. Map Figma components to project-local components or Storybook components.
4. Surface conflicts between Figma, code tokens, Storybook docs, and existing
   UI.
5. Implement or review using local code patterns and verify with browser
   evidence where feasible.

## Output

Return:

- Figma-to-code mapping
- component and token matches
- conflicts or missing assets
- implementation plan or changed files
- verification notes

Do not store Figma file ids, access tokens, selected-frame data, screenshots,
or exported assets in Role source.
