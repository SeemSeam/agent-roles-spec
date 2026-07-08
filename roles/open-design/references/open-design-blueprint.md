# Open Design Role Blueprint

Schema: `agent-roles/mother-role-blueprint/v1`

## Identity

- Role id: `agentroles.open-design`
- Name: `Open Design`
- Naming rationale: reuse the upstream product and repository name as requested
  by the maintainer.
- Catalog level: `experimental`
- Version strategy: start at `0.1.0`; bump when the vendored upstream ref or
  wrapper contract changes.
- Publication target: `roles/` catalog.
- Maintainers: Agent Roles maintainers.

## Purpose

- Purpose: wrap the upstream Open Design workbench as a portable Role while
  normalizing host-hidden upstream paths into Agent Roles source directories
  and keeping runtime setup plus generated state outside Role source.
- Responsibilities: expose upstream skills, design systems, templates, docs,
  plugins, CLI source, and MCP guidance; route design tasks through normalized
  Role directories and the upstream source mirror; document provenance and
  runtime boundaries.
- Non-goals: silently install or run Open Design; store secrets, provider
  state, daemon state, generated artifacts, package caches, or task progress.
- Interaction mode: `interactive`
- Initiates actions: `false`

## Shape Decision

- Decision: `single_role`
- Rationale: the maintainer asked for one Role named `open-design`; the
  upstream source is a broad design workbench but can be wrapped as one
  source-carrying specialist Role with normalized Agent Roles entrypoints.
- User constraints: full upstream source should be included and the Role should
  state that it is an Open Design wrapper.
- Unsupported surfaces: runtime installation, daemon lifecycle, MCP provider
  projection, plugin trust, credentials, local ports, and generated artifacts
  are not Role source.

## Contents Map

| Source | Role path | Type | Treatment | Notes |
| --- | --- | --- | --- | --- |
| `nexu-io/open-design` ordinary source | `upstream/open-design/` | reference/tool/plugin/template/source | `vendored_modified` | Upstream mirror excluding `.git`, local dependency/build/cache dirs, and hidden host paths that are normalized below. Upstream `SKILL.md` files are reference-library files, not startup skills. |
| `.claude/skills/od-contribute` | `skills/od-contribute/` | skill | `vendored_modified` | Converted from hidden Claude skill path to Agent Roles skill path. |
| `.claude/commands/od-contribute.md` | `prompts/od-contribute-command.md` | prompt | `vendored_modified` | Converted from hidden Claude command path to Role prompt. |
| `.claude-plugin/marketplace.json` | `plugins/open-design-marketplace/marketplace.json` | plugin/reference | `vendored_modified` | Converted from hidden marketplace path. |
| `plugins/*/.claude-plugin` and `.mcp.json` | `plugins/open-design-claude/`, `plugins/community-import-smoke-test-claude/` | plugin | `vendored_modified` | Hidden plugin metadata and MCP snippet renamed into non-hidden Role plugin paths. |
| `.github/`, `.vaunt/`, `docs/superpowers/` | `references/open-design-github/`, `references/open-design-vaunt/`, `references/open-design-superpowers/` | reference | `vendored_modified` | Hidden or upstream-ignored reference/support content preserved in non-hidden Role paths. |
| `.env.example`, `.dockerignore`, `.gitignore`, `.helmignore`, `.node-version`, `.clawscan-allow` | `templates/open-design-runtime-config/` | template/reference | `vendored_modified` | Runtime/config examples preserved without hidden filenames. |
| Wrapper instructions | `memory.md` | memory | `synthesized` | Defines role posture and source/projection boundary. |
| Wrapper skill | `skills/open-design-workbench/` | skill | `synthesized` | Routes tasks into vendored upstream source. |
| Provenance note | `references/open-design-provenance.md` | reference | `synthesized` | Records ref, license, inventory, exclusions, and risks. |
| Tool manifest | `tools/open-design-tools.toml` | tool | `synthesized` | Advisory runtime setup declaration for Host Adapters. |
| Adapter notes | `adapters/*/README.md` | adapter | `synthesized` | Host-specific projection guidance. |

## Boundaries

- Project Binding exclusions: selected project directories, Open Design project
  ids, generated artifacts, plugin apply snapshots, MCP enablement, local
  ports, and concrete permission grants.
- Runtime state exclusions: daemon data, desktop app state, package caches,
  build output, screenshots, traces, logs, plugin install state, and local
  projects.
- Provider state exclusions: Codex, Claude Code, CCB, Hive, or other provider
  homes and generated config.
- Generated projection exclusions: host-native skill projections, MCP config,
  command wrappers, bridge records, and role-owned cleanup ledgers.
- Secrets handling: secret names only; never store API keys, OAuth tokens, or
  provider sessions in Role source.

## Provenance

| Source id | Locator | Access date | License status/value | Copy treatment | Confidence | Blocking status | Notices/modifications/notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `open-design` | `https://github.com/nexu-io/open-design` at `f24bda9c97cf80a7d95c118ea7a5bbcdfe69f30d` | 2026-07-04 | known: Apache-2.0 repository, with nested MIT/Apache notices preserved | `vendored_modified` | high | clear | `.git` and local dependency/build/cache dirs excluded; hidden host paths normalized into Agent Roles directories. |

## Permissions And Adapters

- Read files: required to inspect vendored source and target project context.
- Write files: advisory; needed only when the user asks to create design output
  or a Host Adapter projects runtime config.
- Network: advisory; needed for runtime installation, docs, package fetches,
  model providers, plugins, and MCP.
- Secrets: external only.
- Adapter notes: Codex, Claude Code, CCB, and Hive may project Open Design
  wrapper skills, plugin content, or MCP runtime, but generated state remains
  outside Role source. Codex/CCB projection must use `allowlist-only` skill
  discovery and must not preload upstream Open Design `SKILL.md` files.

## Validation Plan

- TOML parse: load `roles/open-design/role.toml`.
- Contents paths: verify wrapper files and key upstream paths exist.
- Catalog: list/install/resolve `agentroles.open-design` from a clean store.
- Source-boundary scan: confirm `.git`, dependency dirs, caches, provider state,
  direct secret files, and hidden upstream entrypoint paths are absent from the
  upstream mirror and represented in non-hidden Role paths where needed.
- Realistic prompts: ask for Open Design skill selection, DESIGN.md work, MCP
  setup planning, and design review.
- Negative prompts: ask the Role to silently install MCP, store an API key,
  write daemon state into Role source, or claim the vendored source is already
  running.

## Write Scope

- Files to create: `roles/open-design/**` and `tests/test_open_design_role.py`.
- Files to modify: none required outside the new Role and test.
- Files not to touch: unrelated dirty Role, collection, CLI, and README changes.
- Stop conditions: license uncertainty, secrets in vendored source, failed Role
  load, failed content path validation, or unacceptably large package policy.
