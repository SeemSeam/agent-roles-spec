# Mobile Platform And Stack Guide

Access date: 2026-06-18.

This reference captures the research basis for `agentroles.mobile_app_engineer`.
Use it to choose platform posture and implementation patterns. Do not treat it
as permission to install tools, copy assets, or bypass project conventions.

## Research Brief

- Goal: create a mobile app Role that can plan, implement, review, and validate
  iOS and Android apps without being tied to one framework.
- Target stacks: React Native, Expo, Flutter, SwiftUI, Jetpack Compose, and
  native iOS/Android projects.
- Target hosts: Codex, Claude Code, CCB, Hive.
- Non-goals: store signing material, submit apps, silently install SDKs, or
  copy license-unclear UI kits and sample apps into Role source.
- Evidence standard: prefer official platform docs and maintained skill/tool
  sources; use community sources only as advisory patterns.

## Inspected Sources

| Source | Authority | What was inspected | Design impact |
| --- | --- | --- | --- |
| Apple Human Interface Guidelines | official | platform design guidance entrypoint | Use Apple guidance for iOS-native behavior, platform idioms, and app polish. |
| Apple Design Resources | official | design templates, icon production templates, color guides, SF fonts, SF Symbols links | Treat Apple UI kits and templates as external design resources, not vendored Role assets. |
| Material Design 3 | official | Material design system entrypoint | Use Material as Android and cross-platform design reference where project style allows. |
| Android Jetpack Compose docs | official | Compose UI toolkit and Android UI docs | Prefer Compose patterns for native Android Kotlin projects. |
| Android app quality guidance | official | app quality sections and platform expectations | Use as Android release and device-quality gate input. |
| React Native docs | official | core components, architecture, UI, debugging, testing, performance sections | Support React Native apps while checking platform-specific code and native module constraints. |
| Expo docs and Expo Skills docs | official | Expo app creation, EAS, deployment, official AI skills list | Treat Expo as first-class path for TypeScript cross-platform apps and public skills. |
| Flutter docs | official | adaptive design, Material/Cupertino, assets, navigation, testing, performance, release | Support Flutter/Dart apps with widget and platform integration guidance. |
| SwiftUI docs | official | Apple SwiftUI entrypoint | Use for native iOS implementation when SwiftUI is the project stack. |

Source locators:

- https://developer.apple.com/design/human-interface-guidelines/
- https://developer.apple.com/design/resources/
- https://m3.material.io/
- https://developer.android.com/compose
- https://developer.android.com/quality
- https://reactnative.dev/docs/getting-started
- https://docs.expo.dev/
- https://docs.expo.dev/skills/
- https://docs.flutter.dev/
- https://developer.apple.com/documentation/swiftui/

## Stack Decision Rules

Prefer the current repository stack. Change stack only when the user asks for a
new app or migration and the tradeoff is explicit.

| Stack | Use when | Watch for |
| --- | --- | --- |
| Expo / React Native | TypeScript team, cross-platform app, fast iteration, EAS, OTA/update workflow, native requirements fit managed or prebuild workflow | Native module compatibility, config plugins, app size, bridge/new-architecture issues, navigation and platform-specific polish. |
| Bare React Native | Cross-platform TypeScript app with custom native modules or existing native projects | iOS/Android build drift, native dependency upgrades, Gradle/CocoaPods, Hermes, device testing. |
| Flutter | Dart repo, custom-rendered cross-platform UI, strong widget testing, app owns its full rendering layer | Native platform feel, package quality, platform channel boundaries, binary size. |
| SwiftUI | iOS-first app, deep Apple platform integration, widgets, Live Activities, App Intents, Apple-only release | Android parity, minimum OS targets, UIKit interop, preview/test coverage. |
| Jetpack Compose | Android-first Kotlin app, Material 3, deep Android integration, modern native UI | iOS parity, state/restoration, performance in lazy lists, minimum SDK and Play quality gates. |

## Mobile Architecture Checks

For any stack, inspect:

- navigation and deep-link ownership;
- app lifecycle and restore behavior;
- state and cache boundaries;
- secure storage and credential handling;
- networking, retry, offline, and conflict resolution;
- permission prompts and purpose strings;
- push notifications and background work;
- list virtualization and image/video pipelines;
- feature ownership and test seams;
- release configuration and environment separation.

## Platform UX Checks

- iOS: safe areas, tab bars, navigation stacks, sheets, swipe/back gestures,
  Dynamic Island/notch behavior, keyboard, haptics, dynamic type, VoiceOver,
  Sign in with Apple where required, App Store review risk.
- Android: system back, edge-to-edge layout, Material components, predictive
  back where relevant, permissions, notification channels, TalkBack, foldables,
  Play quality, app links, adaptive icons.
- Cross-platform: make platform differences intentional. Do not force one
  platform's UI conventions onto the other unless brand or product constraints
  justify it.
