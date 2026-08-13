# Architecture Reviewer

`archi` is a production-ready Role for architecture review.

It carries identity, memory, reusable skills, tool documentation, plugin
content, adapter notes, and validation notes without depending on one host's
runtime internals.

## Purpose

Review architecture drift, boundaries, dependency topology, decisions, change
impact, distributed-system reliability, and structural risk without depending
on one tool.

## Responsibilities

- Review diffs for architecture risk.
- Select appropriate architecture and code-review evidence sources.
- Continue with direct source review when optional tools are missing.
- Explain coupling, boundary, dependency, decision, and reliability tradeoffs.
- Review dependency topology, module boundaries, decision drift, blast radius,
  migration reversibility, and distributed-system failure modes.
- Translate architecture risks into reviewable fitness functions and gates.
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
- `skills/archi-*`: reusable architecture-review skills, including
  `archi-evidence-map` for tool-independent evidence selection plus focused
  methods for topology, boundaries, fitness functions, decision drift, change
  impact, and distributed-system reliability.
- `skills/vendor/*`: public/open-source skills carried with provenance and
  license notices for code review, architecture deepening, and review-lane
  workflows.
- `references/architecture-toolbox.md`: researched tool and skill-library
  guidance for optional architecture/code-review evidence.
- `references/vendored-skill-provenance.md`: source refs, license status, copy
  treatment, and exclusions for carried third-party skills.
- `prompts/`: reusable review prompt examples.
- `tools/`: tool documentation placeholder.
- `plugins/`: role-contained plugin content example.
- `adapters/`: host-specific mapping notes and optional adapter assets.
- `tests/`: validation notes and mounted-behavior evaluation suite.

## Vendored Public Skills

`archi` carries selected public/open-source skills directly in the Role
package. These skills are usable without separate installation when the Host
Adapter projects Role skills.

- `addyosmani/agent-skills` `code-review-and-quality`: vendored intact for
  multi-axis code review across correctness, readability, architecture,
  security, and performance.
- `mattpocock/skills` `improve-codebase-architecture`: vendored with
  documented modifications so architecture deepening review remains read-only
  inside `archi`.
- `obra/superpowers` `requesting-code-review`: vendored intact for independent
  review-lane handoff.
- `obra/superpowers` `receiving-code-review`: vendored intact for rigorous
  evaluation of review feedback before accepting or rejecting it.

Additional public sources are kept as references or patterns:

- `awesome-skills/code-review-skill`: progressive disclosure and
  stack-specific references. `archi` uses `archi-evidence-map` plus
  `references/architecture-toolbox.md` instead of loading every stack rule by
  default.
- `maragudk/skills`: independent review-lane and decision-workflow patterns.
  `archi` can recommend separate analysis, execution, and review lanes for
  high-risk changes, while final approval stays outside the Role.
- Claude Code Review public guidance: severity, deduplication, local diff
  review, and customizable review instructions. `archi` uses the same pattern
  of advisory, evidence-backed findings rather than automatic approval.

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

The core role declares runtime `network = false`. The CCB adapter's optional
Architec install and update hooks may need network access to fetch
`@seemseam/archi` from the npm registry; that install/update requirement is
declared in `adapters/ccb/adapter.toml`.
