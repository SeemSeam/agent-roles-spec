# SU-CCB Workflow Operator

`su-ccb` is a preview Role that packages the SU-CCB workflow into Agent Roles
source. It carries the Claude-side coordinator skills, Codex-side executor
skills, runtime helper library, kernel references, project templates, Claude
plugin manifest snapshot, adapter notes, and validation notes.

The Role is intentionally a source package, not an installed runtime. A host
adapter must still decide how to project the Claude coordinator content, Codex
executor skills, CCB runtime configuration, and project-specific binding into a
live project.

## Packaging Decision

`agentroles.su_ccb` is intentionally published as one preview Role, not as a
family of separate coordinator, executor, and documentation Roles. SU-CCB is a
single workflow contract whose surfaces share kernel references, runtime
helpers, project templates, and state semantics.

The Role carries three mount surfaces:

- coordinator: `su-*` and `requirement-reanalyze` workflow skills.
- executor: `ccb-execute` implementation, exploration, consultation, and
  receipt skills.
- document maintainer: `ccb-doc` documentation routing and archive support.

Host adapters may project only the surface they can support. A partial
projection is a degraded mount of this same Role, not a separate Role identity.
Do not split SU-CCB into multiple published Roles unless the Agent Roles spec
adds first-class bundle or topology support, or upstream separates the
compatibility contracts.

## Purpose

Operate the SU-CCB engineering workflow: Claude-side planning, approval,
dispatch, review, archive, and recovery coordinated with Codex-side execution
and documentation skills.

## Responsibilities

- Drive the seven-node SU-CCB workflow from requirement analysis through
  archive.
- Maintain approval gates, explicit user decisions, dispatch contracts, review
  gates, and audit trails.
- Use the bundled runtime helpers for governed writes, CAS, locks, schema
  validation, EventJournal records, and worktree state.
- Coordinate Codex execution, exploration, consultation, receipt, and
  documentation work through the bundled executor skills.
- Keep docs human-readable truth, `docs/.ccb` coordination state, Console
  projection, and CCB communication boundaries distinct.
- Report unsupported host-adapter behavior instead of silently projecting
  content into the wrong host surface.

## Non-Goals

- Replace `claude_codex_bridge`, `ccbd`, Console, Claude Code, Codex,
  SuperClaude, or Superpowers.
- Treat Role installation as a live CCB runtime mount.
- Store project-specific requirements, task progress, EventJournal output,
  provider sessions, or runtime state in Role source.
- Bypass SU-CCB runtime helpers with direct writes to governed `docs/.ccb`
  files.
- Grant permissions automatically or hide installer behavior in memory or
  prompts.

## Contents

- `role.toml`: Role Definition with stable identity, permissions, content
  inventory, and adapter display metadata.
- `memory.md`: durable Role operating boundaries.
- `skills/su-*` and `skills/requirement-reanalyze`: Claude-side SU-CCB command
  and workflow skills.
- `skills/ccb-execute` and `skills/ccb-doc`: Codex-side execution,
  consultation, receipt, and documentation skills.
- `lib/`: governed write, state, draft, reconcile, routing, worktree, schema,
  and EventJournal helper modules used by the skills.
- `references/kernel/`: SU-CCB kernel node manifests, schemas, guard registry,
  state model, and workflow contracts.
- `templates/`: project initialization templates and Claude hook templates.
- `plugins/claude-ccb`: Claude plugin manifest and marketplace metadata
  snapshot carried as Role-contained plugin content.
- `adapters/`: host-specific notes for Claude Code, Codex, and CCB.
- `tests/`: validation notes.

## Source Boundary

This directory is Role source. It must not contain mounted project state,
provider sessions, conversation history, runtime pid/socket files, generated
Console projection output, or project-specific `docs/.ccb` working data.

The `templates/docs/.ccb/` directory is template source content. It is not
runtime state and should only be copied or projected by an adapter or
initialization tool into a target project.

## Runtime Requirements

The Role content expects a host adapter or user workflow to provide:

- `claude_codex_bridge` / `ccbd` for Claude-Codex communication.
- A Claude-capable surface for `/ccb:su-*` coordinator skills.
- A Codex-capable surface for `ccb-execute` and `ccb-doc`.
- Node.js for bundled `.mjs` helper scripts.
- Optional SuperClaude and Superpowers integrations when available.

Installing the Role with `agent-roles install su-ccb` only installs source
content into the Role store. Live mounting, CCB agent names, approved
permissions, project scope, and runtime topology belong to Project Binding or
host-owned configuration.

## Naming Note

The canonical Role id is `agentroles.su_ccb`. The primary aliases are
`su-ccb`, `su_ccb`, `su.ccb`, and `ccb-workflow`. The plain alias `ccb` is
intentionally not claimed because it is easy to confuse with the CCB runtime
command and other CCB Roles.
