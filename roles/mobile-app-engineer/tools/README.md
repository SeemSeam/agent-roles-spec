# Mobile App Tooling

This Role does not install tools by itself. Tool use must follow the user's
request, Project Binding, and Host Adapter policy.

Useful optional tools depend on the app stack:

- React Native or Expo: Node package manager, Expo CLI, EAS CLI, Metro, React
  Native DevTools, Expo dev client, and optional Expo MCP or official Expo
  Skills.
- iOS: Xcode, xcodebuild, simctl, Instruments, TestFlight, App Store Connect,
  and Swift Package Manager.
- Android: Android Studio, Gradle, adb, Android Emulator, Android Studio
  profiler, Play Console, and bundletool.
- Flutter: Flutter SDK, Dart, Flutter DevTools, pub.dev packages, and platform
  build tooling.
- Cross-platform testing: Detox, Maestro, Appium, XCTest, Espresso, Playwright
  for web surfaces, and project-native unit or integration tests.
- Design/assets: Figma, Apple Design Resources, Material Design kits, SF
  Symbols, Material Symbols, Lucide, Expo Vector Icons, Rive, Lottie, and
  project-local design tokens.

Never put generated build outputs, app-store credentials, signing keys,
provisioning profiles, device logs, screenshots, crash dumps, simulator state,
or installed tool caches into Role source.
