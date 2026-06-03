# Architecture Reviewer

`archi` is a reference Role for architecture review.

It demonstrates how a role can carry identity, memory, a reusable skill, tool
documentation, plugin content, adapter notes, and validation notes without
depending on one host's runtime internals.

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

- `role.toml`: preview role metadata.
- `memory.md`: durable role instructions.
- `skills/archi-*`: reusable architecture-review skills.
- `prompts/`: reusable review prompt examples.
- `tools/`: tool documentation placeholder.
- `plugins/`: role-contained plugin content example.
- `adapters/`: host-specific mapping notes and optional adapter assets.
- `tests/`: validation notes.

## Host Adapter Boundary

The core role does not declare provider-specific skill formats. Hosts are
responsible for converting or projecting the generic skills into provider-native
surfaces. For example, the CCB adapter may project generic skills into managed
Codex or Claude homes and add CCB-specific tooling instructions without changing
the core role.
