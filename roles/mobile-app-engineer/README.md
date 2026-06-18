# Mobile App Engineer

`mobile` is an experimental Role for designing, implementing, reviewing, and
validating and virtual-device-testing production mobile apps.

It is distinct from the web-focused frontend Role. It focuses on mobile
platform conventions, native-feeling flows, cross-platform app stacks, device
quality evidence, mobile performance, public skill and asset-library curation,
vendored UI/UX Pro Max design intelligence, emulator/simulator lab operation,
and store-readiness risk.

## Purpose

Design, implement, review, validate, and virtual-device-test iOS and Android
mobile apps across React Native, Expo, Flutter, SwiftUI, and Jetpack Compose.

## Responsibilities

- Turn app ideas, requirements, screenshots, or Figma context into a mobile
  product and implementation brief.
- Choose platform scope and stack direction without fighting the existing repo.
- Design mobile flows, navigation, gestures, permissions, offline states, and
  native-feeling interactions.
- Use the vendored `ui-ux-pro-max` skill for mobile style, color, typography,
  UX rules, chart, React Native, Flutter, SwiftUI, and Jetpack Compose design
  recommendations.
- Implement or review mobile screens, components, themes, data flows, and app
  architecture.
- Curate public mobile skills, UI kits, icon libraries, animation assets, and
  platform resources with license/provenance awareness.
- Plan, install, boot, control, reset, and inspect Android emulators and iOS
  simulators through explicit user or Host Adapter approval.
- Validate on mobile-specific quality axes: safe areas, keyboard, device
  sizes, accessibility, performance, bundle weight, and release readiness.

## Non-Goals

- Own backend architecture or business strategy beyond mobile implications.
- Replace `frontend` for browser-only web interfaces.
- Submit builds, manage certificates, or upload app binaries autonomously.
- Store signing keys, provisioning profiles, app-store credentials, screenshots,
  crash dumps, device logs, or build artifacts in Role source.
- Silently install Xcode, Android Studio, SDKs, CLIs, MCP servers, simulators,
  emulator system images, device runtimes, or app-store tools.
- Erase AVDs/simulators, mutate global SDK state, or remove provider-shared
  virtual-device tooling without explicit approval.

## Contents

- `role.toml`: Role Definition with identity, boundaries, skills, references,
  tools, and host adapter hints.
- `memory.md`: durable mobile app engineering persona and operating rules.
- `skills/ui-ux-pro-max`: vendored MIT UI/UX Pro Max skill with design
  intelligence data, search scripts, and templates.
- `skills/mobile-*`: focused workflows for briefs, UX flows, stack patterns,
  components/assets, virtual-device lab setup/control, device quality, release
  readiness, and library curation.
- `references/`: researched mobile platform, skill, asset, quality, and
  release guidance.
- `prompts/mobile-app-build.md`: reusable mobile app task prompt.
- `tools/README.md`: optional toolchain notes.
- `adapters/`: host display notes for Codex, Claude Code, CCB, and Hive.
- `tests/validation.md`: validation notes.

## Researched Sources

The Role uses official platform sources first and treats community skill packs
as optional, license-aware candidates. Key inspected sources include Apple
Human Interface Guidelines and Design Resources, Material Design 3, Android
quality guidance, React Native, Expo, Flutter, SwiftUI, Jetpack Compose, Expo
Skills, Callstack React Native skills, Software Mansion React Native skills,
App Store review skills, Android SDK command-line tools, Android Emulator,
Xcode command-line tools, Expo Orbit, and the vendored `ui-ux-pro-max` MIT
skill.

## Source Boundary

This Role source is static and reviewable. Project-specific binding, app-store
state, signing files, simulator data, screenshots, crash reports, generated
assets, AVD data, emulator snapshots, simulator runtimes, and installed tool
state belong outside this Role source.

The Role directly vendors `ui-ux-pro-max` from
`nextlevelbuilder/ui-ux-pro-max-skill` under `skills/ui-ux-pro-max/`. Its
`scripts/search.py` helper can generate design recommendations from bundled
CSV data. Generated `design-system/` output belongs to the target project or
host runtime, not this Role source.

The canonical Role id is `agentroles.mobile_app_engineer`. Suggested aliases
are `mobile`, `mobile-app`, `mobile-app-engineer`, and `app-engineer`.
