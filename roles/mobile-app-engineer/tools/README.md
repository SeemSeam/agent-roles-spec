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
  profiler, Play Console, bundletool, Android SDK command-line tools,
  `sdkmanager`, `avdmanager`, and the `emulator` command.
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

## Virtual Device Lab

The Role may help check, install, boot, control, and clean up virtual-device
tooling when the user or Host Adapter explicitly authorizes host mutation.
Treat these as machine or provider-shared state, not Role source.

Preferred workflow:

1. `check`: inspect OS, CPU/virtualization support, SDK locations, existing
   simulators, AVDs, and connected devices without changing anything.
2. `plan`: list exact packages, runtimes, AVD names, simulator devices,
   environment variables, and project commands that would change host state.
3. `apply`: run installation, creation, boot, app install, launch, log,
   screenshot, reset, or cleanup commands only after approval.

Common command families:

- Android setup: `sdkmanager --list`, `sdkmanager --install ...`,
  `avdmanager list`, `avdmanager create avd ...`, `emulator -list-avds`,
  `emulator @<name>`, and `adb devices`.
- iOS setup on macOS: Xcode or Xcode Command Line Tools, simulator runtime
  installation, `xcrun simctl list`, `xcrun simctl boot`, `xcrun simctl
  install`, `xcrun simctl launch`, screenshots, videos, logs, shutdown, and
  erase operations.
- Expo and React Native: Expo Orbit, `eas build:run`, `npx expo run:*`,
  Metro, and project-native scripts.
- Flutter: `flutter devices`, `flutter emulators`, `flutter emulators
  --launch`, and `flutter run`.
- Automation: Maestro, Detox, Appium, XCTest, Espresso, and stack-native
  integration tests.

Never silently install or upgrade Xcode, Android Studio, SDK packages, system
images, simulator runtimes, app-store CLIs, or MCP servers. Never erase
virtual-device data or remove provider-shared tooling without explicit
approval.
