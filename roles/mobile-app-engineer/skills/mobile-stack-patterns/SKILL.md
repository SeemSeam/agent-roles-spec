---
name: mobile-stack-patterns
description: Apply mobile implementation patterns for React Native, Expo, Flutter, SwiftUI, Jetpack Compose, native modules, routing, state, data fetching, storage, offline behavior, and platform-specific code. Use when coding or reviewing mobile app architecture.
---

# Mobile Stack Patterns

Use this skill when implementing or reviewing code in a mobile app repository.

Read `references/mobile-platform-and-stack-guide.md` for stack selection and
framework source notes. Read project files before recommending packages or APIs.

## Workflow

1. Detect the stack:
   - Expo or React Native: `package.json`, `app.json`, `app.config.*`,
     `ios/`, `android/`, Metro, Expo Router, React Navigation.
   - Flutter: `pubspec.yaml`, `lib/`, platform folders, Flutter tests.
   - iOS native: Xcode project/workspace, Swift packages, SwiftUI/UIKit files.
   - Android native: Gradle, Kotlin, Compose, AndroidManifest, modules.
2. Respect existing conventions:
   - routing/navigation;
   - state management;
   - styling/theming;
   - data fetching and cache;
   - error handling;
   - test style.
3. Design for mobile constraints:
   - app lifecycle;
   - background/foreground transitions;
   - permissions;
   - offline and retry;
   - deep links;
   - push notifications;
   - storage and secure storage.
4. Keep architecture practical:
   - feature folders or platform modules where local style supports it;
   - shared domain logic separated from view code when useful;
   - native bridges isolated and tested;
   - no broad rewrites for narrow UI tasks.
5. Verify with available project checks.

## Output

Return:

- detected stack and assumptions
- implementation changes or review findings
- platform-specific branches
- tests/checks run or missing
- remaining risks
