# Decision 003: Role Source Is A Static Module Definition

Date: 2026-06-09

## Context

Agent Roles needs to support reusable specialist agents without coupling the
role source to one project, host runtime, or session. If mounting a role edits
the role definition or writes project state into role memory, the role stops
being portable and becomes hard to unmount, update, review, or reuse.

## Decision

For v0.1, Role source is treated as a static module definition.

`role.toml` is the compact Role Definition: stable identity, responsibilities,
non-goals, content inventory, advisory permission needs, and host adapter
hints.

`memory.md` is durable role instruction content: prose guidance, working style,
operating boundaries, examples, and stable domain framing for mounted agents.

Concrete task objectives, mounted instance names, project scope, permission
grants, team topology, project-specific prompt additions, progress, traces, and
runtime state belong outside Role source in Project Binding, mounted role
state, or host-owned runtime state.

Mounting a Role must not mutate the Role source by default. Host adapter
projection output is generated content, not source content, and should be
traceable to the mounted Role and removable on unmount.

## Consequences

- Role source remains reviewable, versionable, and portable across hosts.
- Project Binding is a separate concept from Role Definition, but v0.1 does
  not need to standardize a cross-host binding file format.
- Runtime progress, session history, provider state, and project-private data
  remain forbidden in Role source.
- If stable identity, responsibilities, non-goals, or role memory need to
  change, the correct operation is to fork or derive a new Role rather than
  editing the mounted source for one project.
