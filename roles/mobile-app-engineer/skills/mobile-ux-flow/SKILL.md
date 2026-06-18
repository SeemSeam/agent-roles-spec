---
name: mobile-ux-flow
description: Design native-feeling mobile flows. Use for mobile navigation, tabs, stacks, sheets, gestures, safe areas, keyboard behavior, haptics, permissions, onboarding, empty/error/loading/offline states, and platform-specific iOS or Android interaction polish.
---

# Mobile UX Flow

Use this skill when the user asks for app screens, mobile interaction design,
navigation, state design, or platform polish.

Read `references/mobile-platform-and-stack-guide.md` when Apple HIG, Material
Design, or stack-specific platform patterns matter.

## Workflow

1. Map the user journey:
   - entry points;
   - primary task;
   - secondary actions;
   - exit, cancellation, undo, and recovery.
2. Define navigation:
   - tabs, stacks, drawers, sheets, modals, deep links, back behavior;
   - platform differences for iOS and Android.
3. Design mobile states:
   - loading, skeleton, empty, partial, error, offline, retry, disabled,
     success, background sync, and optimistic updates.
4. Place sensitive moments carefully:
   - permission prompts;
   - sign-in;
   - payments;
   - account deletion;
   - destructive actions;
   - push notification opt-in.
5. Check physical interaction:
   - thumb reach;
   - safe areas;
   - keyboard avoidance;
   - touch target size;
   - scroll inertia;
   - haptics and reduced-motion behavior.
6. Produce implementation notes tied to the current stack.

## Output

Return:

- flow summary
- navigation structure
- screen states
- platform-specific differences
- accessibility and motion notes
- implementation hooks for the current stack
- open risks
