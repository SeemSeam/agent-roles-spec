---
name: mobile-component-system
description: Select and apply mobile component systems, design tokens, icons, illustrations, fonts, animation assets, and UI kits. Use for app visual systems, reusable mobile components, theming, asset-library choices, and license or bundle-size tradeoffs.
---

# Mobile Component System

Use this skill when a mobile app needs a visual system, component strategy,
tokens, icons, illustrations, animation assets, or UI library selection.

Read `references/mobile-skill-and-asset-library.md` when public libraries,
asset sources, or license/provenance decisions matter.

## Workflow

1. Inventory local sources first:
   - existing theme/tokens;
   - component library;
   - icon wrapper;
   - font setup;
   - image and animation assets;
   - Figma or design-system docs.
2. Choose the smallest useful library surface:
   - native platform components when platform feel matters;
   - React Native Paper, Tamagui, NativeWind, or local primitives only when
     they match the repo;
   - Flutter Material/Cupertino widgets or local design-system widgets;
   - SwiftUI/Compose native components for native apps.
3. Treat assets as product dependencies:
   - verify license and source;
   - prefer vector icons or platform icon systems where appropriate;
   - avoid importing entire icon packs;
   - control animation size and runtime cost;
   - document attribution and modification rules.
4. Define reusable primitives:
   - color, typography, spacing, radius, elevation, motion, haptics;
   - buttons, inputs, lists, cards, sheets, tabs, empty/error states;
   - accessibility labels and dynamic type behavior.
5. Check bundle and performance impact before adding heavy assets or runtimes.

## Output

Return:

- local component and token inventory
- selected library/assets with rationale
- license/provenance notes
- component plan
- bundle/performance risks
- follow-up validation
