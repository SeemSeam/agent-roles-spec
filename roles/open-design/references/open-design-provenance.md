# Open Design Provenance

## Source

- Upstream: `https://github.com/nexu-io/open-design`
- Commit: `f24bda9c97cf80a7d95c118ea7a5bbcdfe69f30d`
- Access date: 2026-07-04
- Local Role paths: normalized Role directories plus `upstream/open-design/`
- Treatment: `vendored_modified`
- Wrapper Role id: `agentroles.open-design`

## License

The upstream repository root declares `Apache-2.0` in `package.json` and
includes the Apache License in `LICENSE`.

The vendored tree also contains nested license files for bundled skills,
templates, examples, and dependencies. Those notices are preserved in place.
Inventory found 83 license files in the upstream tree.

## Inventory Summary

Source inventory at ingestion time:

- source files, excluding `.git`: 10762
- source size, excluding `.git`: about 259 MB of file payload and about 291 MB
  on disk after vendoring
- top-level Open Design skills: 161
- Open Design design-system folders: 151
- Open Design design-template folders: 112
- `SKILL.md` files across the tree: 509
- `DESIGN.md` files across the tree: 295
- package metadata files: 28
- plugin manifests found by inventory: 5
- reference-like files found by inventory: 277
- secret-like findings: 0
- runtime-state-path findings: 0
- write-api findings: 0

## Copy Treatment

The Role preserves upstream Open Design content, but it does not expose hidden
upstream host paths as primary Role entrypoints. Files that upstream keeps in
hidden or ignored paths are normalized into Agent Roles source directories:

- `.claude/skills/od-contribute` -> `skills/od-contribute`
- `.claude/commands/od-contribute.md` -> `prompts/od-contribute-command.md`
- `.claude-plugin/marketplace.json` -> `plugins/open-design-marketplace/marketplace.json`
- `plugins/open-design/.claude-plugin/plugin.json` -> `plugins/open-design-claude/plugin.json`
- `plugins/open-design/.mcp.json` -> `plugins/open-design-claude/mcp.json`
- `plugins/community/import-smoke-test/.claude-plugin/plugin.json` -> `plugins/community-import-smoke-test-claude/plugin.json`
- `.github/` -> `references/open-design-github/`
- `.vaunt/` -> `references/open-design-vaunt/`
- `docs/superpowers/` -> `references/open-design-superpowers/`
- `.dockerignore`, `.gitignore`, `.node-version`, `.env.example`, `.helmignore`,
  and `.clawscan-allow` -> `templates/open-design-runtime-config/`

`upstream/open-design/` remains as the ordinary upstream source mirror for
non-hidden paths. Wrapper metadata, memory, skills, tools, adapters, tests, and
provenance files are authored outside that mirror.

Upstream Open Design contains hundreds of `SKILL.md` files. They are retained
as source/reference material but are intentionally not declared from
`contents.skills`. Active startup skill projection is limited to:

- `skills/open-design-workbench`
- `skills/od-contribute`

Adapters should load upstream `SKILL.md` files only by explicit path after the
wrapper skill selects the relevant source for a task.

Excluded from the vendored copy:

- `.git`
- hidden upstream host/source paths that are normalized into Role directories
- `node_modules`
- `.next`
- `dist`
- `build`
- `.turbo`
- `.cache`
- `coverage`

These exclusions are source-boundary and package-size hygiene, not content
rewrites. No such dependency/build/cache directories were required for the
Role contract.

## Runtime Boundary

The vendored source does not mean Open Design is installed or running. Runtime
installation may need Node, pnpm, package downloads, native module builds, the
`od` CLI, daemon startup, desktop app state, plugin installation, MCP
projection, provider config, local ports, and external credentials.

Those are Host Adapter or Project Binding concerns. They must not be written
into Role source.

## Update Rule

To update this Role to a newer upstream Open Design version:

1. Fetch a fresh upstream ref.
2. Rerun source inventory.
3. Review license, secret-like findings, runtime-state findings, and size.
4. Replace `upstream/open-design/`.
5. Update this provenance file, `open-design-blueprint.md`, `role.toml`
   `version` or `updated_at`, and tests.
