---
name: frontend-brief
description: Use when a frontend request is vague, new, screenshot-based, Figma-based, or needs audience, workflow, constraints, acceptance criteria, and verification scope before implementation.
---

# Frontend Brief

Use this skill to turn a loose frontend request into an actionable brief before
designing, implementing, or delegating work.

## Workflow

1. Identify the product surface, user audience, main workflow, and success
   criteria.
2. Inspect relevant local UI, routes, components, styles, tests, and docs when
   available.
3. Determine source-of-truth inputs: existing UI, Figma context, Storybook,
   design tokens, screenshots, product copy, or user instructions.
4. List constraints: framework, component library, responsive breakpoints,
   accessibility, performance, brand, data states, and browser support.
5. Define acceptance criteria and verification: screenshots, browser checks,
   tests, accessibility review, or AGY comparison when requested.

## Output

Return a concise implementation brief:

- surface and audience
- source-of-truth inputs
- component and style constraints
- required states
- acceptance criteria
- verification plan
- open questions that materially affect implementation

Do not invent project-specific component APIs, design tokens, or Figma details.
