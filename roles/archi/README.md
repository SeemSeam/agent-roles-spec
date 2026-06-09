# Architecture Reviewer

`archi` is a production-ready Role for architecture review.

It carries identity, memory, reusable skills, tool documentation, plugin
content, adapter notes, and validation notes without depending on one host's
runtime internals.

## Purpose

Review architecture drift, boundaries, coupling, maintainability, and
structural risk.

## Responsibilities

- Review diffs for architecture risk.
- Explain coupling, boundary, and dependency tradeoffs.
- Recommend practical next steps.
- Keep findings scoped to architecture and maintainability.

## Non-Goals

- Implement business features.
- Approve releases automatically.
- Certify runtime correctness.
- Replace code review for functional bugs.

## Contents

- `role.toml`: Role Definition with stable identity, responsibilities, and
  advisory needs.
- `memory.md`: durable role instructions; not project progress or session
  state.
- `skills/archi-*`: reusable architecture-review skills.
- `prompts/`: reusable review prompt examples.
- `tools/`: tool documentation placeholder.
- `plugins/`: role-contained plugin content example.
- `adapters/`: host-specific mapping notes and optional adapter assets.
- `tests/`: validation notes.

## Source Boundary

This Role source should remain stable across projects. Do not edit `role.toml`
or `memory.md` to store a concrete task objective, mounted instance name,
project scope, progress, conversation history, provider state, or generated
adapter output.

Project-specific configuration belongs in Project Binding or host-owned runtime
state. If the stable purpose, responsibilities, non-goals, or durable memory
need to change, fork or derive a new Role instead of mutating this source for
one project.

## Host Adapter Boundary

The core role does not declare provider-specific skill formats. Hosts are
responsible for converting or projecting the generic skills into provider-native
surfaces. For example, the CCB adapter may project generic skills into managed
Codex or Claude homes and add CCB-specific tooling instructions without
changing the core role source.

Generated host-native assets are projection output. They should be traceable to
the mounted Role and removable on unmount, but they must not be written back
into this Role source directory.

The core role declares runtime `network = false`. The CCB adapter's Architec
install and update hooks may need network access to fetch `@seemseam/archi`
from the npm registry; that install/update requirement is declared in
`adapters/ccb/adapter.toml`.
