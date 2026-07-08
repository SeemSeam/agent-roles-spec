# Open Design

`open-design` is an experimental Role wrapper for
[`nexu-io/open-design`](https://github.com/nexu-io/open-design).

It vendors the upstream Open Design repository and reorganizes upstream
agent-facing hidden paths into Agent Roles source directories. It exposes Open
Design as a Role for design briefs, visual direction, DESIGN.md systems,
prototypes, design review, templates, plugins, CLI source, and MCP guidance.

## Purpose

Expose Open Design as a portable Role while preserving the source/projection
boundary. The Role carries upstream source; it does not claim that Open Design
is installed, authenticated, built, or running.

## Responsibilities

- Use normalized Open Design skills, design systems, docs, templates, and
  plugins as the primary design workbench.
- Explain that this Role is a wrapper around upstream Open Design.
- Plan `od` CLI, daemon, desktop, plugin, and MCP setup as explicit runtime
  work owned by a Host Adapter or user-approved command.
- Keep generated artifacts, daemon data, MCP config, provider state, and
  credentials outside Role source.
- Preserve upstream license and provenance.

## Non-Goals

- Silent installation of Node, pnpm, Open Design, MCP servers, provider config,
  plugins, or desktop apps.
- Storing API keys, provider sessions, local ports, generated artifacts,
  screenshots, traces, package caches, build output, or task progress in this
  Role.
- Replacing frontend or mobile engineering ownership for production code
  integration and verification.

## Contents

- `role.toml`: Role Definition and inventory.
- `memory.md`: durable wrapper behavior and runtime boundaries.
- `skills/open-design-workbench`: wrapper skill for routing into normalized
  and upstream Open Design source.
- `skills/od-contribute`: normalized upstream Open Design contribution skill
  from `.claude/skills/od-contribute`.
- `upstream/open-design/skills`, `upstream/open-design/design-templates`, and
  `upstream/open-design/plugins`: full upstream skill library kept as on-disk
  reference material. These paths are intentionally not declared as active
  startup skills.
- `plugins/`: normalized Open Design Claude plugin, marketplace, and smoke-test
  plugin metadata from upstream hidden plugin paths.
- `prompts/`: normalized upstream Claude command prompt.
- `templates/open-design-runtime-config`: normalized upstream runtime config
  examples, MCP snippet, ignore files, node version, and scan allowlist.
- `references/open-design-github`, `references/open-design-vaunt`, and
  `references/open-design-superpowers`: normalized upstream hidden or ignored
  reference content.
- `upstream/open-design/`: vendored upstream source mirror from
  `nexu-io/open-design`, with hidden host paths represented by the normalized
  Role directories above.
- `references/open-design-blueprint.md`: source-ingest blueprint.
- `references/open-design-provenance.md`: upstream ref, license, inventory,
  copy treatment, and risk notes.
- `tools/open-design-tools.toml`: advisory tool manifest for Open Design CLI,
  daemon, plugin, and MCP runtime planning.
- `adapters/`: host notes for Codex, Claude Code, CCB, and Hive.
- `tests/validation.md`: validation notes.

## Source Boundary

The upstream source is vendored as Role source, but files that would otherwise
live in hidden host-specific paths are normalized into explicit Agent Roles
directories. Runtime installation still belongs to the host environment.
Generated Open Design projects, artifacts, daemon data, plugin install state,
MCP config, provider homes, and secrets must stay outside this Role.

The canonical Role id is `agentroles.open-design`.

## Skill Projection Boundary

Open Design carries hundreds of upstream `SKILL.md` files. Host Adapters must
not project all of them into provider startup context. Active startup skills
are limited to:

- `skills/open-design-workbench`
- `skills/od-contribute`

The upstream Open Design skill library remains available on disk for
`open-design-workbench` to search and load by exact path when a task needs a
specific upstream workflow.
