# Agent Roles Open Source Plan

Date: 2026-06-02

## Purpose

Plan the first public GitHub release of `agent-roles` as a host-neutral
RolePack specification project.

This plan is intentionally separate from CCB's internal
[`rolepack-system`](../rolepack-system/README.md) plan. CCB may later consume
the specification through an adapter, but this plan does not move CCB role
store, projection, reload, ask, or sidebar behavior into the new repository.

## File Map

- [roadmap.md](roadmap.md): phased future plan from spec preview to CLI and
  host compatibility work.
- [implementation-status.md](implementation-status.md): latest handoff state,
  including the repository rename and current terminology direction.
- [first-release-requirements.md](first-release-requirements.md): concrete
  v0.1 public release requirements and acceptance checklist.
- [open-questions.md](open-questions.md): unresolved questions only.
- [topics/readme-narrative.md](topics/readme-narrative.md): README structure,
  positioning, and message hierarchy.
- [topics/repository-structure.md](topics/repository-structure.md): proposed
  repository layout and document ownership.
- [topics/host-adapter-strategy.md](topics/host-adapter-strategy.md): how
  Claude Code, Codex, CCB, Hive, and future hosts should be handled without
  contaminating the core spec.
- [topics/rolepack-content-boundary.md](topics/rolepack-content-boundary.md):
  what a role can carry, including skills, memory, tools, plugin content, and
  forbidden runtime state.
- [decisions/001-spec-first-project.md](decisions/001-spec-first-project.md):
  Agent Roles starts as a specification project; CLI and runtime work follows.
- [decisions/002-rolepack-contains-plugin-content.md](decisions/002-rolepack-contains-plugin-content.md):
  plugin content may live inside role packages; plugin systems are not the
  root abstraction.
- [decisions/003-role-source-is-static-module.md](decisions/003-role-source-is-static-module.md):
  Role source is a static module definition; project binding and runtime state
  stay outside Role source.

## Scope

In scope:

- A public README that explains "from skills to roles" for developers and
  "from scattered skills/plugins to managed roles" for users.
- A RolePack package layout and metadata convention.
- A v0.1 spec preview release with templates, reference roles, validation
  expectations, and contribution rules.
- Host adapter contracts for Claude Code, Codex, CCB, Hive, and future hosts.
- Conformance and harness planning for later releases.

Out of scope for the first public release:

- A role registry or marketplace.
- A full mount/unmount runtime.
- A global plugin manager.
- A security sandbox.
- A CCB runtime extraction.
- Provider session management.
- Complete permissions enforcement.

## Reading Path

Start with [implementation-status.md](implementation-status.md) for the latest
handoff, then [topics/readme-narrative.md](topics/readme-narrative.md) for the
public story, then [first-release-requirements.md](first-release-requirements.md)
for v0.1 scope, then [roadmap.md](roadmap.md) for future sequencing.
