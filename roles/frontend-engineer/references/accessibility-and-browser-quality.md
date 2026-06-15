# Accessibility And Browser Quality Reference

Use this reference when reviewing or validating frontend UI in a browser.

## Accessibility Review

- Prefer native elements before ARIA.
- Check name, role, value, labels, focus order, keyboard activation, escape
  behavior, and focus restoration.
- Check color contrast, text scaling, target size, reflow, reduced motion, and
  error messaging.
- Verify interactive states: hover, active, focus-visible, selected, disabled,
  loading, error, empty, and skeleton.
- Use accessibility snapshots or equivalent browser evidence when available.

## Responsive Review

- Validate the smallest supported mobile width, common tablet width, desktop,
  and wide desktop when relevant.
- Check text wrapping, overflow, hit targets, sticky regions, modals, drawers,
  data tables, charts, and empty states.
- Ensure fixed-format elements use stable dimensions or responsive constraints.
- Confirm dynamic content cannot resize or shift critical UI unexpectedly.

## Browser Quality Evidence

Collect evidence from:

- screenshots or visual inspection across viewports;
- accessibility tree or snapshots;
- console and network logs;
- interaction smoke tests;
- performance traces when LCP, INP, CLS, hydration, or main-thread work is in
  scope.

Do not store screenshots, traces, browser profiles, or local runtime logs in
Role source.
