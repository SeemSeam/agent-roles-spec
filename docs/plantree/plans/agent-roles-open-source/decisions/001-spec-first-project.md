# Decision 001: Agent Roles Starts As A Specification Project

Date: 2026-06-02

## Context

The project could start as a role manager, CLI, Claude Code integration, Codex
integration, CCB extraction, or registry. Starting with runtime work would make
the core model inherit one host's assumptions too early.

## Decision

Agent Roles starts as a host-neutral RolePack specification project.

The first public release defines package layout, metadata conventions,
validation expectations, forbidden-state rules, reference roles, templates, and
host adapter contracts. CLI, role management, mount/unmount runtime, and full
compatibility harnesses follow after the specification stabilizes.

## Consequences

- The project can stay useful to Claude Code, Codex, CCB, Hive, and future
  hosts.
- The first release can be credible without shipping a complete runtime.
- README and roadmap must clearly say that runtime management is future work.
- Adapter contracts must not redefine the core spec.
