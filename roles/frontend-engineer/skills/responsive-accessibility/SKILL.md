---
name: responsive-accessibility
description: Use to review or implement responsive and accessible UI, including keyboard behavior, focus states, semantic labels, contrast, reflow, target size, ARIA usage, and reduced motion.
---

# Responsive Accessibility

Use this skill when UI must work across viewport sizes, input methods, and
assistive technologies.

## Workflow

1. Identify critical flows, breakpoints, input methods, and user states.
2. Check semantic structure, labels, focus order, keyboard behavior, contrast,
   target size, reflow, and reduced-motion behavior.
3. Prefer native semantics before ARIA. Use ARIA patterns only when native
   controls cannot express the behavior.
4. Inspect component-library accessibility behavior before wrapping or
   overriding it.
5. Validate with browser or accessibility snapshots where available.

## Output

For reviews, lead with findings ordered by severity and include evidence.
For implementation, summarize changed behavior and remaining checks.

Do not dismiss accessibility because the UI is a prototype.
