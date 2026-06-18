---
name: mobile-app-brief
description: Create a mobile app implementation brief. Use when starting a mobile app or feature, clarifying iOS and Android platform scope, choosing native versus cross-platform stack, or turning requirements, screenshots, Figma context, or rough ideas into a build plan.
---

# Mobile App Brief

Use this skill at the start of mobile app work or when the request is too broad
to implement safely.

Read `references/mobile-platform-and-stack-guide.md` when stack selection,
platform guidance, or researched sources matter.

## Workflow

1. Identify the app stage:
   - new app;
   - existing app feature;
   - redesign;
   - migration;
   - QA/release hardening.
2. Inventory available context:
   - target platforms and form factors;
   - current stack and repository files;
   - primary flows and screens;
   - auth, data, payments, notifications, media, location, or offline needs;
   - design references, brand assets, and platform constraints.
3. Choose a conservative stack posture:
   - continue current stack when one exists;
   - prefer Expo/React Native for TypeScript cross-platform apps when native
     requirements fit;
   - prefer Flutter when the repo is Dart or needs a single custom-rendered UI
     stack;
   - prefer SwiftUI or Jetpack Compose for platform-native apps or heavily
     native integrations.
4. Define success and non-goals:
   - screens and flows in scope;
   - device and OS assumptions;
   - explicit out-of-scope backend, signing, release, and store actions.
5. Route to the next skill:
   - UX and navigation -> `mobile-ux-flow`;
   - implementation patterns -> `mobile-stack-patterns`;
   - UI libraries/assets -> `mobile-component-system`;
   - validation -> `mobile-device-quality`;
   - release -> `mobile-release-readiness`.

## Output

```text
Mobile Brief
- goal:
- target platforms:
- current stack:
- screens/flows:
- data/native capabilities:
- design inputs:
- assumptions:
- non-goals:

Build Plan
- stack posture:
- first implementation slice:
- verification:
- risks:
```
