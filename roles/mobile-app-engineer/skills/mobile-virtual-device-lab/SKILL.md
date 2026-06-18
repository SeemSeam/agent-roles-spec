---
name: mobile-virtual-device-lab
description: Plan, install, boot, control, inspect, reset, and clean up Android emulators, Android Virtual Devices, iOS Simulators, Expo Orbit, React Native, Expo, and Flutter virtual-device workflows with explicit host approval.
---

# Mobile Virtual Device Lab

Use this skill when the user asks to install, configure, boot, control, reset,
inspect, automate, or troubleshoot mobile virtual devices.

Read `tools/README.md` and `references/mobile-quality-and-release.md` when
installation, simulator/emulator command shape, host mutation, device evidence,
or cleanup boundaries matter.

## Boundaries

- Do not silently install or upgrade Xcode, Android Studio, Android SDK
  packages, emulator system images, simulator runtimes, Expo Orbit, app-store
  CLIs, MCP servers, or automation tools.
- Do not erase AVDs, simulators, snapshots, app data, logs, screenshots, or
  provider-shared tool directories without explicit approval.
- Treat Android SDKs, AVDs, emulator images, Xcode components, simulator
  runtimes, CoreSimulator devices, app installs, logs, screenshots, videos, and
  derived build output as host or project runtime state.
- Keep signing keys, provisioning profiles, API keys, service-account files,
  app-store credentials, crash dumps, screenshots, and device logs out of Role
  source.

## Workflow

1. Classify the request:
   - capability check;
   - install or repair toolchain;
   - create virtual device;
   - boot or stop device;
   - install and launch app;
   - capture logs, screenshots, videos, or performance evidence;
   - wipe/reset/cleanup;
   - automate tests.
2. Identify host and project context:
   - host OS and CPU architecture;
   - current stack: native iOS, native Android, React Native, Expo, Flutter,
     SwiftUI, or Jetpack Compose;
   - repo scripts and build outputs;
   - available tools such as `xcrun`, `xcodebuild`, `sdkmanager`,
     `avdmanager`, `emulator`, `adb`, `npx expo`, `eas`, and `flutter`;
   - existing simulator runtimes, AVD names, connected devices, and SDK paths.
3. Start with non-mutating checks:
   - iOS/macOS: `xcode-select -p`, `xcodebuild -version`, and `xcrun simctl
     list`.
   - Android: `sdkmanager --list`, `avdmanager list`, `emulator -list-avds`,
     and `adb devices`.
   - Expo/RN: package scripts, `npx expo diagnostics`, `eas --version`, and
     Metro/dev-client setup when present.
   - Flutter: `flutter doctor`, `flutter devices`, and `flutter emulators`.
4. Produce an install/control plan before mutation:
   - exact SDK packages, system images, simulator runtimes, AVD names, device
     profiles, app artifact paths, environment variables, and commands;
   - expected disk/network/time impact;
   - cleanup and rollback approach;
   - commands that require user or Host Adapter approval.
5. Apply only after approval:
   - Android: install SDK packages, create AVDs, boot emulators, install APKs,
     launch activities, inspect logs, capture screenshots, and shut down or
     wipe when requested.
   - iOS: install Xcode components or simulator runtimes, create or boot
     simulators with `simctl`, install simulator-compatible apps, launch bundle
     identifiers, capture screenshots/videos, and shut down or erase when
     requested.
   - Expo/RN/Flutter: prefer project-native scripts for build, install,
     launch, and test flows.
6. Report evidence:
   - tools and versions;
   - devices created or used;
   - app artifact installed;
   - commands run;
   - findings and failures;
   - files produced outside Role source;
   - cleanup status and remaining host state.

## Output

```text
Virtual Device Lab
- scope:
- host:
- stack:
- non-mutating checks:
- proposed mutations:
- approval needed:
- commands:
- evidence:
- cleanup:
- residual risk:
```

Do not block all mobile review if virtual devices are unavailable. Continue
with source-level review and state which emulator or simulator evidence is
missing.
