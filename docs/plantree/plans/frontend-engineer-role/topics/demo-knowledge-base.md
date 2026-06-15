# Demo Knowledge Base

Date: 2026-06-14

## Purpose

Plan a lightweight demo and inspiration knowledge base for the frontend
engineer Role without copying third-party source or private design assets.

## Policy

- Store links, tags, source authority, access date, license posture, and design
  takeaways.
- Do not copy third-party component code, screenshots, Figma files, brand
  assets, or private project UI into Role source unless provenance and license
  review explicitly allow it.
- Prefer official and maintained sources over social posts or one-off demos.
- Use demo references to sharpen design vocabulary and validation criteria, not
  to clone another product.

## Candidate Catalog Tags

- product surface: dashboard, editor, commerce, docs, analytics, workflow,
  developer tool, consumer app, AI app;
- UI density: operational, editorial, immersive, compact, mobile-first;
- component class: navigation, form, data table, chart, command palette,
  modal, settings, empty state, onboarding, editor, canvas;
- design-system trait: tokenized, multi-brand, dark/light, accessible,
  animated, responsive, data-heavy;
- validation lens: visual polish, accessibility, performance, interaction,
  content hierarchy, motion, browser compatibility.

## Candidate Sources

- Official Storybook Showcase.
- The target project's existing component library and design-system docs.
- Radix UI and shadcn examples only when the target stack is compatible.
- One enterprise component-library reference only when relevant to the product
  surface, chosen from the project's existing dependency or closest equivalent.
- Figma, Storybook, browser tooling, Web Vitals, and design-token docs.
- Project-local examples discovered through repository inspection.

## Redundancy Rule

Do not maintain a broad catalog of equivalent UI libraries. For each product
surface, keep at most:

- one project-local example;
- one official/design-system example;
- one external inspiration reference.

## First Draft Shape

The Role may carry a `references/demo-catalog.md` file with entries like:

```md
## Source Name

- URL:
- Authority: official / maintained / community / unknown
- License posture:
- Tags:
- Use for:
- Do not use for:
- Access date:
```

## Validation

The demo catalog is useful only if it helps the Role produce better work. Test
with prompts that ask the Role to:

- choose one or two references for a given product surface;
- explain why a reference fits or does not fit the user request;
- translate observations into original design constraints;
- reject copying when the user asks to clone protected or license-unclear
  material.
