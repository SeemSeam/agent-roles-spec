# Agent Roles

From skills to roles.

Agent Roles is a host-neutral specification for packaging specialist AI agents
as portable, mountable RolePacks.

For developers: move from skill development to role development.  
For users: move from scattered skills and plugins to managed roles.

A RolePack can carry memory, skills, prompts, tools, plugin content, and host
adapter metadata, then be mounted into a compatible host as an isolated
specialist agent.

The specification comes first. The CLI, role manager, and mount runtime follow.

> This translation follows `README.md`. If the two versions differ, the English
> version is authoritative.

## Scope

The v0.1 release is a spec preview. It defines the RolePack package shape,
metadata conventions, forbidden secret/runtime-state rules, templates,
reference roles, host adapter contracts, and conformance fixtures.

It does not ship a registry, sandbox, scheduler, provider session manager, CCB
runtime extraction, or host-specific plugin manager.
