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

Each Role Definition carries Role revision metadata. `version` is the Role's
own semantic version, separate from the `agent-roles` npm/PyPI package version.
Published catalog Roles should also include `created_at`, `updated_at`, and a
catalog level so users and hosts can compare Role revisions before installing,
updating, or mounting them.

### Host Adapter

A Host Adapter describes how a Role enters a specific host environment. The same Role can be read and mounted by multiple hosts. The Host Adapter captures the differences in directory layout, config format, tool entry points, and plugin projection for each host.

### Package And Runtime Operations

| Operation | Description |
|-----------|-------------|
| **Install** | Copy, validate, and record a Role in the local `.roles/installed` store without changing any project or host runtime |
| **Update** | Refresh one already installed Role from its original source; it fails if the Role is not installed yet |
| **Upgrade** | User-facing alias for update; `upgrade --all` refreshes all installed Roles |
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

## Published Roles

These are the currently published catalog Roles. Each entry is installable
through `agent-roles` and may expose host-specific adapters.

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **Version**: `0.2.3`
- **Level**: `stable`
- **Purpose**: Reviews architecture drift, boundaries, coupling, maintainability, and structural risk.
- **Best for**: architecture reviews, dependency-boundary checks, coupling analysis, and practical next-step sequencing.
- **Contents**: Role instructions, architecture review skills, reusable prompts, tool documentation, plugin content, and host adapters.
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **Install**: `agent-roles install archi`
- **Update**: `agent-roles update archi`
- **Source**: [`roles/archi`](roles/archi/)

</details>

<details>
<summary><strong>agentroles.mother</strong> - Role Mother</summary>

- **Version**: `0.1.0`
- **Level**: `preview`
- **Purpose**: Creates and audits spec-compliant Agent Roles with actionable compliance and optimization findings.
- **Best for**: drafting new Roles, auditing Role source, tightening memory, skills, and prompts, and checking catalog readiness.
- **Contents**: Role authoring memory, role creation and audit skill, reusable audit prompt, validation notes, and host adapter display metadata.
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **Install**: `agent-roles install mother`
- **Update**: `agent-roles update mother`
- **Source**: [`roles/mother`](roles/mother/)

</details>

---

## Package Manager Preview

This repository now includes a preview `agent-roles` package-management CLI. It
is intentionally narrower than the future mount/unmount runtime: it focuses on
role discovery, local installation, updates, sync, diagnostics, and
machine-readable resolution.

Install the current public preview with npm:

```bash
npm install -g agent-roles
agent-roles --version
```

The npm package provides the `agent-roles` command through a Node wrapper that
invokes the bundled Python module, so it requires Python 3.11+ on `PATH`.
The PyPI package is prepared but still pending trusted-publishing completion;
once it is live, `pipx install agent-roles` and `pip install agent-roles` will
provide the same command and the `agent_roles` Python module.

The npm package does not bundle the installable `roles/` catalog. Role catalog
changes are published through the GitHub catalog, so adding or updating Roles
does not require an `agent-roles` npm/PyPI package release. Use
`agent-roles list` to discover available Roles from the configured catalog and
`agent-roles install <role>` to install only the Roles you need. Role aliases
such as `archi` resolve to their canonical catalog IDs, such as
`agentroles.archi`.

Preview commands:

```bash
agent-roles list
agent-roles install archi
agent-roles install --all
agent-roles update archi
agent-roles upgrade archi
agent-roles upgrade --all
agent-roles sync .
agent-roles doctor archi
agent-roles resolve archi
```

`install` is a package-store operation, not a runtime mount. `update` refreshes
one already installed Role and will not silently install a missing Role.
`upgrade` is the user-facing update alias, with `upgrade --all` for every
installed Role. `install --all` installs all currently discoverable catalog
Roles. Add `--json` when an adapter or automation flow needs machine-readable
output; JSON includes the Role `version`, `catalog_level`, digest,
`update_reason`, and available revision timestamps when the source Role
provides them. Same-version content patches can be represented by digest
changes without publishing a new `agent-roles` package version.

By default, the CLI discovers Roles from the current catalog-like directory and
from the public `agent-roles-spec` catalog cloned into `~/.roles/catalogs`.
Set `AGENT_ROLES_STORE` to choose a different store root, `AGENT_ROLES_SPEC_HOME`
or `AGENT_ROLES_CATALOG` to point at local catalogs, and `AGENT_ROLES_NO_REMOTE=1`
to disable the default Git catalog.

The repo-local `cli/agent-roles` wrapper and `python -m agent_roles` run the
same CLI module. Host adapters should consume the JSON output; live `mount` and
`unmount` commands remain deferred until the Host Adapter contracts stabilize.

---

## Current Status

> The specification is in early design stage.

Current focus:

- Role concept boundaries and Role Definition structure
- How skills, memory, tools, and plugins are organized
- How Host Adapters are expressed
- Preview package-management CLI and `.roles` store behavior
- Minimum behavioral constraints for mount / unmount

Upcoming: schema expansion, examples, role manager integration, and live
mount/unmount runtime.

---

## Adapter Roadmap

Host Adapter development will begin with these multi-agent projects:

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Adapters for Claude Code, Codex, and other major hosts are also planned. We will actively work toward native Role format support across platforms.
