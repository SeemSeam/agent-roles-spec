# Open Questions

Date: 2026-06-14

## Questions

1. Should the first version support only web frontend, or also React Native and
   mobile app UI?
   - Current assumption: web frontend first.

2. What evidence is required to promote the Role from `experimental` to
   `preview`?
   - Current assumption: realistic behavior prompts for brief, visual
     direction, Figma-to-code, browser quality, and AGY delegation should pass
     before promotion.

3. Should translated README files beyond root and zh-CN receive frontend Role
   entries while the Role remains `experimental`?
   - Current assumption: defer broad i18n sync until promotion review.

## Resolved

- `agy` in this plan means Google Antigravity CLI.
- The first design pass should use a single Role, not multiple Roles or a
  topology recipe.
- Canonical Role id is `agentroles.frontend_engineer`.
- Initial catalog level is `experimental`.
- User-facing aliases are `frontend`, `frontend-engineer`,
  `frontend-designer`, and `ui-engineer`.
- Recommended core MCP/tool references are Figma, Storybook, Playwright, and
  Chrome DevTools. shadcn, Context7, Dembrandt, and `agy-frontend-mcp` are
  optional.
- MCP/tool self-containment should be implemented as reviewable
  `contents.tool_manifests` plus role-contained templates and explicit
  Host Adapter projection, not by preinstalling packages or credentials inside
  Role source.
- AGY delegation is a dedicated skill plus tool runbook because it needs
  explicit task boundaries, isolated worktrees, diff review, and merge
  approval.
- The first demo catalog is link-only with tags and usage notes, with no
  copied third-party source, screenshots, private design files, or extracted
  live-site tokens.
