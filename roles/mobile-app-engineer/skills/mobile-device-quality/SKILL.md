---
name: mobile-device-quality
description: Validate mobile apps with simulator, emulator, device, accessibility, performance, crash, log, and form-factor evidence. Use for mobile QA, safe-area bugs, keyboard issues, gesture failures, layout clipping, jank, startup time, memory, network, and release-blocking defects.
---

# Mobile Device Quality

Use this skill when the app must be validated beyond source review.

Read `references/mobile-quality-and-release.md` when quality gates, device
coverage, accessibility, performance, or release evidence matters.

## Workflow

1. Identify available evidence:
   - local tests;
   - simulator/emulator;
   - physical device;
   - logs/crash output;
   - screenshots or recordings;
   - profiling tools;
   - CI artifacts.
2. Choose device coverage:
   - at least one small phone and one large phone when visual risk matters;
   - tablet/foldable when the app claims support;
   - iOS and Android when cross-platform behavior matters;
   - accessibility settings when UI is text or form heavy.
3. Validate core surfaces:
   - launch, auth, navigation, forms, lists, media, offline, permissions,
     errors, deep links, and push notification paths as relevant.
4. Inspect mobile-specific risks:
   - safe areas;
   - keyboard;
   - scroll and gesture conflicts;
   - clipping;
   - focus order;
   - dynamic type;
   - contrast;
   - reduced motion;
   - startup, jank, memory, and list virtualization.
5. Report what was verified and what remains unverified.

## Output

Return:

- devices/viewports/tools checked
- findings ordered by severity
- evidence source for each finding
- fixes made or recommended
- missing evidence and residual risk

Do not store screenshots, device logs, traces, crash dumps, profiles, or build
artifacts in Role source.
