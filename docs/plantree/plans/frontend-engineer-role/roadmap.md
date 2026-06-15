# Frontend Engineer Role Roadmap

Date: 2026-06-14

## Done

- Captured the user intent: design an advanced frontend engineer Role, with
  `agy` meaning Google Antigravity CLI rather than AG-UI.
- Established that this work should begin as a plan-tree planning scope, not an
  immediate `roles/<id>/` scaffold.
- Recorded a first shape decision: one Role first, with optional delegated
  tools and no runtime state in Role source. See
  [decisions/001-single-role-first.md](decisions/001-single-role-first.md).
- Added a high-star/open-source candidate research topic covering agent skills,
  frontend design tools, design-system tooling, MCP sources, and ecosystem
  references. See
  [topics/high-star-open-source-candidates.md](topics/high-star-open-source-candidates.md).
- Reduced overlapping candidates into a primary source set: official MCP/tool
  docs, `taste-skill` for visual-taste inspiration, `dembrandt` for optional
  public-site design extraction, DTCG/Style Dictionary for tokens, and direct
  `agy` delegation with `agy-frontend-mcp` only as an optional bridge.
- Added Role Definition and role memory design guidance so the future
  `role.toml` contract and `memory.md` durable instructions stay separate from
  Project Binding, MCP configuration, and runtime state.
- Landed the experimental `agentroles.frontend_engineer` draft in
  `roles/frontend-engineer/` with Role Definition, README, memory, nine focused
  skills, references, tool notes, adapters, validation notes, aliases, root
  README/zh-CN README entries, and focused tests.
- Verified the draft with TOML parsing, `python -m pytest -q`,
  `git diff --check`, and temporary-store `list` / `install frontend` /
  `resolve frontend` CLI smoke checks.
- Upgraded `agentroles.frontend_engineer` to `0.2.0` with optional
  `contents.tool_manifests`, `tools/mcp-tools.toml`, and
  `plugins/frontend-mcp-toolbox/` template content so compatible Host Adapters
  can prepare role-private MCP/tool runtimes without hiding installers or
  storing runtime state in Role source.
- Verified the `0.2.0` upgrade with focused frontend/tool-manifest tests, full
  pytest, `git diff --check`, and temporary-store CLI `list` / `install
  frontend` / `resolve frontend` smoke checks.

## In Progress

- Review the experimental Role for promotion readiness and real-world behavior
  gaps.

## Next

1. Run realistic behavior prompts for frontend brief, visual direction,
   Figma-to-code, browser-quality review, and AGY delegation.
2. Decide whether `experimental` remains the right catalog level or whether the
   Role can move to `preview` after behavior review.
3. Resolve remaining naming and publication questions in
   [open-questions.md](open-questions.md).
4. Decide whether all translated README files need frontend Role entries now,
   or whether root and zh-CN coverage is enough while the Role remains
   experimental.
5. Add prompt-level evaluation notes if the Role is promoted beyond
   experimental.

## Deferred

- Treating `agy` as a required dependency.
- Bundling MCP server configs, credentials, browser profiles, Figma files,
  worktrees, generated screenshots, or project-specific design assets in Role
  source.
- Preinstalling MCP packages, browser runtimes, AGY account state, package
  caches, generated MCP configuration, or credentials inside the Role source
  directory.
- Creating a multi-agent topology recipe for frontend review/implementation
  until the single Role has proven insufficient.
- Publishing as `preview` or `stable` before validation prompts and adapter
  notes are reviewed.
