# README Narrative

Date: 2026-06-02

## Positioning

`Agent Roles` is a host-neutral specification for packaging specialist AI
agents as portable, mountable `RolePacks`.

The first public story must establish:

- Agent Roles is specification-first.
- RolePack is the main artifact.
- Skills and plugins are role contents, not the root abstraction.
- CLI, role management, mount/unmount runtime, and host compatibility follow
  after the specification stabilizes.

## First-Screen Draft

```markdown
# Agent Roles

From skills to roles.

Agent Roles is a host-neutral specification for packaging specialist AI agents
as portable, mountable RolePacks.

For developers: move from skill development to role development.  
For users: move from scattered skills and plugins to managed roles.

A RolePack can carry its own memory, skills, prompts, tools, plugin content,
and host adapter metadata, then descend into a compatible project as an
isolated specialist agent.

The specification comes first. The CLI, role manager, and mount runtime follow.
```

## Message Hierarchy

1. Skills are capabilities.
2. Roles are deployable specialist agents.
3. RolePacks package role identity, memory, skills, tools, plugin content, and
   host adapter metadata.
4. Compatible hosts mount RolePacks into projects.
5. The first release defines the specification, not a complete runtime.

## Developer Narrative

Skill development usually ships isolated capabilities. Role development ships
complete specialist agents.

Instead of publishing one skill and asking users to manually combine it with
memory, tools, plugin content, and host configuration, a developer packages the
whole role as a RolePack.

Short form:

> Build skills. Ship roles.

## User Narrative

Managing scattered skills and plugins is fragile. Users must understand what to
install, how to combine it, which tools it needs, where it writes files, and
how to clean it up.

Role management is simpler: mount one RolePack, get one specialist agent.
Unmount it, and generated role assets should go away with it.

## Avoid

- Do not say plugins are export targets.
- Do not say Agent Roles replaces host-native plugin systems.
- Do not promise instant hot reload for every host.
- Do not describe CCB runtime behavior as the universal model.
- Do not use "injection" for normal activation; use `mount`.
