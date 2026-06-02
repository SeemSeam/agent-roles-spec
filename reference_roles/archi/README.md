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
- `skills/architecture-review/`: reusable architecture-review skill.
- `prompts/`: reusable review prompt examples.
- `tools/`: tool documentation placeholder.
- `plugins/`: role-contained plugin content example.
- `adapters/`: host-specific notes.
- `tests/`: validation notes.
