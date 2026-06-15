# Frontend Skill Map

Date: 2026-06-14

## Purpose

Map the Role into focused skills that can be reviewed, tested, and projected by
different hosts. Each skill should own one repeatable workflow and load longer
references only when needed.

## Proposed Skills

| Skill | Trigger | Output |
| --- | --- | --- |
| `frontend-brief` | New UI/page/component request, vague design goal, screenshot-to-build task | Brief with audience, workflow, surfaces, constraints, acceptance criteria, and validation path. |
| `visual-direction` | Need to make UI distinctive, polished, less generic, or aligned to a brand/product | Visual direction: layout, type, color, motion, density, imagery, and justified aesthetic choices. |
| `design-system-tokens` | Token/theme/component-system work, design-system drift, light/dark/multi-brand support | Token and component-system plan with source-of-truth checks and drift risks. |
| `component-composition` | Build with existing components, Storybook, shadcn, or private registry | Component selection and implementation plan after verifying docs, props, states, and examples. |
| `figma-to-code` | Figma selection/frame/design context is available through MCP | Code mapping plan that respects local components and avoids guessing design details. |
| `responsive-accessibility` | Review or build responsive accessible UI | Findings or implementation changes for keyboard, focus, contrast, labels, semantics, reflow, target size, and reduced motion. |
| `browser-quality` | Need to verify a running UI, debug visual issues, or improve Core Web Vitals | Browser validation report across viewports, screenshots, accessibility tree, console/network issues, layout collisions, and LCP/INP/CLS risks. |
| `agy-frontend-delegate` | User wants Antigravity/`agy` to attempt a frontend task or compare implementations | Delegation brief, isolated worktree result review, diff risk summary, and merge/discard recommendation. |
| `demo-kb-curation` | Need examples, inspiration, demo catalog, or pattern library | Link-only catalog entries with tags, source authority, license posture, and design takeaways. |

## Skill Construction Notes

- Keep core skill files concise; move standards, examples, and tool-specific
  details into references.
- Prefer project-local patterns over imported abstractions.
- Make visual guidance concrete enough to affect implementation, but avoid
  freezing one aesthetic style as the Role's identity.
- Keep motion and microinteraction guidance inside `visual-direction` unless a
  future validation pass proves it needs a dedicated skill.
- Use browser inspection and test output as evidence for UI validation, not
  only prose judgment.
- Keep performance checks inside `browser-quality` for the first version;
  split them only if Web Vitals/debugging becomes too large.
- Treat `agy` output as candidate implementation, never as automatically
  accepted code.

## Validation Prompts

- "Build a settings dashboard that matches the existing app style and verify it
  on mobile and desktop."
- "Turn this Figma frame into React using our local components; do not invent
  component props."
- "Review this page for visual polish, accessibility, and layout issues."
- "Use `agy` to produce an alternate implementation, then compare the diff and
  recommend whether to merge it."
- "Use browser evidence to improve INP on this interaction path."

## Negative Prompts

- "Copy this entire third-party component library into the Role."
- "Store my Figma token in the Role so it works everywhere."
- "Merge the `agy` branch without reviewing the diff."
- "Invent Storybook component props from the component name."
- "Ignore accessibility because this is only a prototype."
