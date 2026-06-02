# Agent Roles

> Agent Roles is a host-neutral specification for packaging specialist AI agents as portable, mountable Roles.

A Role bundles everything a specialist agent needs — skills, memory, tool dependencies, plugin content, and host adapter metadata — into a single portable unit. It can be mounted into a target project's agent, then cleanly unmounted when no longer needed, without affecting the main environment, user global config, or other agents.

The specification is designed to push multi-agent collaboration toward clearer structure:

| Audience | Shift |
|----------|-------|
| **Developers** | From building isolated skills to shipping complete Roles |
| **Users** | From managing scattered skills/plugins to managing roles |

Languages: [简体中文](docs/i18n/README.zh-CN.md) | [日本語](docs/i18n/README.ja.md) | [繁體中文](docs/i18n/README.zh-TW.md) | [한국어](docs/i18n/README.ko.md) | [More](docs/i18n/)

---

## Why Agent Roles

A specialist agent's content is typically scattered across multiple directories, config files, and runtimes:

- System prompts
- Skills pulled on demand
- Project memory and long-term memory
- Tool dependencies
- Host-specific adapter configuration

Migrating means manually copying, installing, and debugging. Unmounting means guessing which files belong to the agent versus the main environment or other agents.

Agent Roles organizes all of this into a standardized Role format, so a specialist agent can be defined, distributed, mounted, and unmounted as a single independent unit.

---

## Core Concepts

### Role

A Role is the core object in Agent Roles — a complete specialist agent definition. It is not just a prompt and not just a skill collection; it is an encapsulation unit that carries its own capabilities, context, and adapter information.

### Role Definition

A Role Definition is the manifest file for a Role. It describes the Role's responsibilities, required skills, tool dependencies, plugin content, host adapter configuration, and the rules for mounting and unmounting.

### Host Adapter

A Host Adapter describes how a Role enters a specific host environment. The same Role can be read and mounted by multiple hosts. The Host Adapter captures the differences in directory layout, config format, tool entry points, and plugin projection for each host.

### Mount / Unmount

| Operation | Description |
|-----------|-------------|
| **Mount** | Attach a Role to a target project by dynamically loading its contents via an index, establishing connections between the Role, the target project, and the host environment |
| **Unmount** | Detach a Role from the target project; session files are retained as needed, all other content is cleared immediately, without affecting the main environment, user global config, or other agents |

---

## What a Role Can Carry

| Content | Description |
|---------|-------------|
| `role instructions` | Role responsibilities, behavior boundaries, and working style |
| `skills` | Capability modules the role uses |
| `memory` | Memory or project context carried by the role |
| `tools` | Commands, scripts, or external tools the role depends on |
| `plugins` | Plugin content the role projects into the host environment |
| `host adapters` | Adapter metadata for different host environments |
| `lifecycle rules` | Rules for handling mount, update, and unmount |

---

## Design Goals

- Specialist agent roles can be clearly defined and independently distributed
- Roles can migrate across projects, be mounted on demand, and be cleanly unmounted
- Role content boundaries are explicit and do not interfere with the main environment or other agents
- Provide a unified specification for CLI, role manager, and mount runtime

---

## Current Status

> The specification is in early design stage.

Current focus:

- Role concept boundaries and Role Definition structure
- How skills, memory, tools, and plugins are organized
- How Host Adapters are expressed
- Minimum behavioral constraints for mount / unmount

Upcoming: schema, examples, CLI prototype, role manager, and mount runtime.

---

## Adapter Roadmap

Host Adapter development will begin with these multi-agent projects:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Adapters for Claude Code, Codex, and other major hosts are also planned. We will actively work toward native Role format support across platforms.
