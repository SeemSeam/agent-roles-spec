# UI/UX Pro Max Vendored Skill Provenance

Access date: 2026-06-18.

`agentroles.frontend_engineer` vendors `ui-ux-pro-max` as a role-contained
skill for frontend UI/UX design intelligence.

## Source

- Upstream repository: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Upstream commit: `b7e3af80f6e331f6fb456667b82b12cade7c9d35`
- Upstream package metadata: `skill.json` version `2.5.0`
- Upstream license: MIT
- Upstream author: Next Level Builder

## Copy Treatment

- Treatment: `vendored_intact`
- Copied into: `skills/ui-ux-pro-max/`
- Copied files:
  - `.claude/skills/ui-ux-pro-max/SKILL.md`
  - `src/ui-ux-pro-max/data/`
  - `src/ui-ux-pro-max/scripts/`
  - `src/ui-ux-pro-max/templates/`
  - `LICENSE`
- Excluded files:
  - `.git/`
  - `.github/`
  - `cli/`
  - `.claude-plugin/`
  - unrelated upstream skills
  - screenshots, docs outside the selected skill, package locks, and generated
    repository metadata

## Role Boundary

The vendored skill is source content. Its scripts are available for explicit
agent use, but they are not hidden installers and do not grant permission to
mutate project files automatically.

Use `skills/ui-ux-pro-max/scripts/search.py` for design-system, color,
typography, UX, chart, product, and stack recommendations when the user asks
for design guidance or when frontend UI quality is central.

Do not store generated `design-system/` output, screenshots, browser profiles,
project-specific URLs, or private brand assets in Role source.
