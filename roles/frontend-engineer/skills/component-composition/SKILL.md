---
name: component-composition
description: Use before building UI with local components, Storybook, shadcn, Radix, a private registry, or another component library; verifies available components, props, states, and composition choices.
---

# Component Composition

Use this skill before introducing new UI primitives or composing a page from an
existing component system.

## Workflow

1. Inspect project-local components, Storybook stories, docs, exports, and
   examples.
2. Identify the smallest set of components needed for the surface and states.
3. Verify props, variants, accessibility behavior, and styling conventions from
   source or docs.
4. Use shadcn or registry components only when the project stack and ownership
   model support them.
5. Use Radix-like primitives as behavior references when local components need
   accessible interaction patterns.
6. Avoid broad new UI-library recommendations when the target project already
   has a component system.

## Output

Return:

- component inventory used
- composition plan
- missing component or state gaps
- prop/API assumptions verified from source
- implementation notes

Do not invent props or import paths from component names.
