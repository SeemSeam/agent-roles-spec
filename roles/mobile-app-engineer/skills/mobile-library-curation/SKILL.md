---
name: mobile-library-curation
description: Curate public mobile skills, UI kits, icon sets, animation runtimes, design resources, sample apps, and asset libraries. Use when choosing what to install, vendor, reference, or avoid for mobile app development.
---

# Mobile Library Curation

Use this skill when the user asks what public skills, UI kits, component
libraries, icon sets, animation assets, or design resources should support a
mobile app Role or project.

Read `references/mobile-skill-and-asset-library.md` for the researched source
list, candidate scorecard, and selection rules.

## Workflow

1. Classify the need:
   - public agent skill;
   - design system or UI kit;
   - icon set;
   - animation or illustration asset;
   - framework component library;
   - release/compliance skill;
   - testing/debugging tool.
2. Check hard gates:
   - license and provenance;
   - current maintenance;
   - platform fit;
   - bundle size/runtime cost;
   - native dependency risk;
   - accessibility support;
   - ability to test in the current repo.
3. Decide treatment:
   - use existing project library;
   - install as project dependency;
   - vendor as Role source only when license/provenance are clear and the
     user wants that behavior carried with the Role;
   - reference only;
   - reject.
4. Keep the recommendation scoped. Do not add a UI kit or animation runtime
   just because it is popular.

## Output

```text
Library Decision
- need:
- recommended source:
- treatment:
- license/provenance:
- maintenance confidence:
- platform fit:
- bundle/runtime impact:
- rejected alternatives:
- verification:
```
