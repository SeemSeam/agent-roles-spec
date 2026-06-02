# Agent Roles

From skills to roles.

Agent Roles is a host-neutral specification for packaging specialist AI agents
as portable, mountable RolePacks.

For developers: move from skill development to role development.  
For users: move from scattered skills and plugins to managed roles.

A RolePack can carry its own memory, skills, prompts, tools, plugin content,
and host adapter metadata, then enter a compatible project as an isolated
specialist agent.

The specification comes first. The CLI, role manager, and mount runtime follow.

Languages: [English](README.md) | [简体中文](README.zh-CN.md) |
[繁體中文](README.zh-TW.md) | [More translations](docs/i18n/)

> If the two versions differ, the English version is authoritative.

## Why Agent Roles

Skills are capabilities. Roles are deployable specialist agents.

A skill teaches an agent how to do one thing. A role defines who the agent is,
what it is responsible for, what memory it carries, which skills and tools it
owns, and how a host can mount and unmount it safely.

Agent Roles does not replace skills or plugins. It organizes them into
complete, portable roles.

## What Is A RolePack

A RolePack is a portable package for one specialist agent role.

A RolePack may contain:

- role identity and responsibilities
- role memory
- skills
- prompts and templates
- tool scripts and tool documentation
- plugin content bundled with the role
- MCP configuration or examples
- host adapter metadata
- validation and conformance tests

The goal is simple: one role directory should describe and carry everything
needed to understand, validate, and mount that role.

Plugin content means host-native plugin files carried inside the role package,
not a requirement to install a global plugin or use an external plugin manager.

## From Skill Development To Role Development

Skill development usually ships isolated capabilities.

Role development ships complete specialist agents.

Instead of publishing a single skill and asking users to manually combine it
with memory, tools, plugins, and host configuration, a developer can package the
whole role as a RolePack.

Build skills. Ship roles.

## From Skills Management To Roles Management

Managing scattered skills and plugins is fragile.

Users need to know what to install, how to combine it, which tools it needs,
where it writes files, and how to clean it up.

Role management is simpler: mount one RolePack, get one specialist agent.
Unmount it, and generated role assets should go away with it.

## Project Scope

Agent Roles starts as a specification project.

The first releases focus on:

- RolePack package layout
- role metadata conventions
- validation rules
- forbidden secret and runtime-state rules
- reference roles
- templates
- host adapter contracts
- conformance tests

The specification leads. The CLI, role manager, and mount runtime follow.

## Hosts And Adapters

Agent Roles is host-neutral.

A host adapter describes how a specific host would consume a RolePack and
project its contents into a running agent environment.

Planned adapter contracts include:

- Claude Code
- Codex
- CCB
- Hive

Adapters may map RolePack contents into host-native concepts such as subagents,
skills, plugins, commands, MCP servers, memory files, or managed provider
state.

## Repository Structure

```text
agent-roles/
  specs/              # RolePack specification
  schemas/            # Validation schemas
  templates/          # Starter RolePack templates
  reference_roles/    # Official example roles
  adapters/           # Host adapter contracts
  conformance/        # Compatibility tests and fixtures
  cli/                # Future CLI implementation
```

A concrete role may look like:

```text
reference_roles/
  archi/
    README.md
    role.toml
    memory.md
    skills/
    prompts/
    tools/
    plugins/
    adapters/
    tests/
```

## Roadmap

### v0.1 Spec Preview

- RolePack package spec
- role metadata conventions
- forbidden-state rules
- starter templates
- first reference roles

### v0.2 Community Roles

- contribution guide
- role quality checklist
- more reference roles
- role gallery

### v0.3 Host Adapter Contracts

- Claude Code adapter contract
- Codex adapter contract
- CCB adapter contract
- Hive adapter contract

### v0.4 Conformance Harnesses

- adapter output validation
- generated asset ownership checks
- mount/unmount compatibility tests

### v0.5 CLI Preview

- validate RolePacks
- render host-specific assets where useful
- prototype mount and unmount for selected hosts

## Non-Goals

Agent Roles is not, in the first release:

- a registry
- a security sandbox
- a multi-agent scheduler
- a provider session manager
- a CCB runtime extraction
- a host-specific plugin manager

Runtime management comes after the RolePack specification stabilizes.

## Contributing

We welcome RolePack contributions.

A good role should have a clear purpose, explicit responsibilities, useful
skills or tools, documented boundaries, and no secrets, credentials, provider
sessions, or runtime state.

Detailed contribution rules will live in `CONTRIBUTING.md`.
