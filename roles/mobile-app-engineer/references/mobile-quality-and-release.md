# Mobile Quality And Release

Access date: 2026-06-18.

Use this reference for mobile QA, accessibility, performance, privacy, store
readiness, and submission reviews.

Primary release targets include App Store, TestFlight, Google Play, Play
testing tracks, Expo EAS, enterprise distribution, and project-specific beta
channels.

## Inspected Sources

| Source | Authority | What was inspected | Design impact |
| --- | --- | --- | --- |
| Apple App Review Guidelines | official | submission review categories and policy entrypoint | Release readiness must flag Apple-specific safety, performance, business, design, and legal risks without claiming approval certainty. |
| Google Play release guidance | official | release workflow and Play Console guidance | Treat Play rollout, testing tracks, metadata, and quality as release gates. |
| Android app quality guidance | official | Android quality guidance entrypoint | Use Android-specific quality and device behavior checks. |
| Flutter testing, performance, release docs | official | testing, DevTools, performance, build/release sections | Use Flutter-native quality and release checks for Flutter apps. |
| React Native docs | official | testing, debugging, performance, Android/iOS guides | Use React Native source and device evidence for RN apps. |
| Expo deployment docs and skills | official | EAS, app stores, updates, metadata, monitoring | Use Expo/EAS checks when the project is Expo. |

Source locators:

- https://developer.apple.com/app-store/review/guidelines/
- https://play.google.com/console/about/guides/releasewithconfidence/
- https://developer.android.com/quality
- https://docs.flutter.dev/
- https://reactnative.dev/docs/getting-started
- https://docs.expo.dev/
- https://docs.expo.dev/skills/

## Device Quality Matrix

Choose the smallest matrix that proves the claim:

- Visual or layout risk: small phone, large phone, dark/light mode, dynamic
  type/font scaling, keyboard open, safe-area extremes.
- Cross-platform risk: one iOS simulator/device and one Android emulator/device.
- Tablet/foldable claim: iPad/tablet or foldable-width validation.
- Accessibility risk: screen reader, focus order, labels, contrast, dynamic
  type, reduced motion, large touch targets.
- Performance risk: cold launch, warm launch, janky list, image-heavy screen,
  animation-heavy screen, memory pressure, network retry.
- Release risk: production-like build, permissions, app icon, launch screen,
  metadata, privacy strings, account deletion, payment flows, crash-free smoke.

## Release Checklist

- Version and build numbers are correct.
- Bundle id/application id, app name, icons, launch screens, and adaptive icons
  match target release.
- Required permissions have clear purpose strings and are requested at useful
  moments.
- Privacy disclosures and tracking consent match actual data collection.
- Account creation has account deletion where required.
- Payments, subscriptions, restore purchases, and external links comply with
  platform policy.
- UGC, kids, health, finance, gambling, VPN, MDM, location, and background
  modes have explicit review notes and product/legal review where needed.
- Store metadata, screenshots, preview videos, and support URLs match shipped
  behavior.
- TestFlight, Play testing tracks, EAS channels, OTA updates, and CI/CD release
  lanes are clearly separated from production.
- Crash, analytics, and monitoring setup avoids logging secrets or sensitive
  personal data.

## Output Severity Guidance

- Blocker: likely crash, inaccessible core flow, store rejection risk,
  credential/signing leak, broken purchase/account deletion/privacy path, or
  untested claimed platform.
- Major: platform mismatch, serious jank, poor offline/error recovery,
  permission overreach, missing release metadata, or weak test coverage on a
  critical flow.
- Minor: polish issues, non-critical layout clipping, copy inconsistency,
  missing secondary state, or optional metadata gap.
- Suggestion: improvements to native feel, motion, haptics, library choice,
  test coverage, screenshots, or monitoring.
