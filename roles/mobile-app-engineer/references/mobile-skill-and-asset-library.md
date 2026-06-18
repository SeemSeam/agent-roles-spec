# Mobile Skill And Asset Library

Access date: 2026-06-18.

Use this reference when selecting public skills, UI kits, icon sets, animation
systems, design resources, or app asset libraries. It records source locators
and recommended treatment; it does not install or copy anything by itself.

## Public Skills And Skill Packs

| Source | Authority | Treatment | Use when | Notes |
| --- | --- | --- | --- | --- |
| Expo Skills | official | reference or vendor with source-ingest | Expo, EAS, Expo Router, native UI, deployment, upgrades, CI/CD | Official Expo skills work with Codex and other agents; prefer as external plugin/skill source unless user asks to vendor selected skills. |
| UI/UX Pro Max | maintained | vendored intact in this Role | Cross-platform style, color, typography, UX, chart, and stack-specific design intelligence | MIT skill bundled under `skills/ui-ux-pro-max/`; use for structured design recommendations. |
| `expo/skills` | official / maintained | reference or vendor with source-ingest | Need exact Expo skill source and MIT license provenance | Good candidate for direct vendoring of selected focused skills after inventory. |
| Callstack React Native Best Practices | maintained | synthesize or vendor selected references after inventory | React Native performance and optimization review | Strong for RN performance; avoid copying all references unless the Role scope requires them. |
| Software Mansion React Native skills | maintained | reference or vendor selected skills after inventory | Debugging, Radon IDE/MCP, React Native/Expo inspection | Good fit for device/debug workflows; depends on available tools. |
| App Store Review Guidelines Skill | community / maintained | reference or vendor after inventory | Pre-submission App Store compliance review | MIT-licensed source observed; useful for Apple review risk, but still advisory. |
| Swift Agent Skills | community / curated | reference | SwiftUI and Apple-platform skill discovery | Curated directory rather than one compact Role dependency. |
| Platform Design Skills | community | synthesize/reference | Apple HIG, Material 3, WCAG rule checks | Useful design checklist pattern; verify licensing and source freshness before vendoring. |

Source locators:

- https://docs.expo.dev/skills/
- https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- https://github.com/expo/skills
- https://github.com/callstackincubator/agent-skills/blob/main/skills/react-native-best-practices/SKILL.md
- https://github.com/software-mansion-labs/skills
- https://github.com/safaiyeh/app-store-review-skill
- https://github.com/twostraws/swift-agent-skills
- https://github.com/ehmo/platform-design-skills

## Asset And UI Libraries

| Source | Authority | Best for | Selection notes |
| --- | --- | --- | --- |
| Apple Design Resources | official | iOS/iPadOS templates, app icon templates, SF fonts, SF Symbols, product bezels | Link or use externally; do not vendor templates into Role source. |
| Material Design 3 and Material Symbols | official | Android and Material-style cross-platform design | Use as design reference; inspect icon/font licensing before packaging. |
| React Native Paper | maintained | Material Design components for React Native | Strong when Material UI fits; avoid if project already has another component system. |
| Tamagui | maintained | Cross-platform React Native/Web styling and UI kit | Useful when app targets RN and web with typed tokens and compiler support; adds architectural commitment. |
| Expo Vector Icons | maintained / Expo ecosystem | RN/Expo icon access | Good for Expo projects; avoid importing whole icon families unnecessarily. |
| Lucide React Native | maintained | Lightweight SVG icon components | Good for custom UI; import icons individually to control bundle size. |
| Lottie React Native | maintained / community | JSON animation playback | Use for simple exported animations; monitor asset size and runtime cost. |
| Rive React Native | maintained | interactive vector animations and state machines | Use for interactive motion; check runtime requirements and native dependencies. |
| React Native Skia | maintained | advanced custom graphics and canvas-like rendering | Powerful but heavier; use only when product needs custom drawing or high-performance graphics. |
| Flutter Material/Cupertino widgets | official | Flutter platform UI | Prefer before adding third-party Flutter UI kits. |

Source locators:

- https://developer.apple.com/design/resources/
- https://fonts.google.com/icons
- https://m3.material.io/
- https://callstack.github.io/react-native-paper/
- https://tamagui.dev/
- https://docs.expo.dev/guides/icons/
- https://lucide.dev/guide/packages/lucide-react-native
- https://github.com/lottie-react-native/lottie-react-native
- https://rive.app/docs/runtimes/react-native/react-native
- https://shopify.github.io/react-native-skia/
- https://docs.flutter.dev/

## Candidate Scorecard

| Candidate | Fit | License/provenance confidence | Default status |
| --- | --- | --- | --- |
| Official platform docs and design resources | high | high for reference use | keep as primary evidence |
| UI/UX Pro Max | high for design intelligence | high; MIT, vendored with provenance | keep as bundled skill |
| Expo Skills | high for Expo/RN | high after source-ingest | reference by default, vendor selected skills when requested |
| Callstack RN skills | medium-high for RN performance | medium-high after inventory | synthesize or vendor selected pieces |
| Software Mansion skills | medium-high for RN debugging tools | medium after inventory | reference unless toolchain exists |
| App Store Review skill | medium-high for iOS compliance | medium-high after inventory | reference or vendor for store-readiness-heavy Role |
| Apple/Material UI kits | high for design | reference-only unless license allows packaging | link externally |
| Icon packs | medium-high | varies by pack | prefer project-local wrapper and individual imports |
| Animation runtimes | medium | varies by runtime and asset | add only when product needs them |

## Selection Rules

1. Prefer project-local assets and component systems.
2. Prefer official platform resources for platform behavior.
3. Choose libraries for a concrete product need, not popularity.
4. Record source URL, license, version/ref, and modification status when
   copying or vendoring.
5. Do not vendor sample apps, generated screenshots, proprietary UI kits,
   brand assets, or unclear-license animations into Role source.
6. Check bundle size, native dependency requirements, accessibility behavior,
   and testability before recommending a runtime dependency.
