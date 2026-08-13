---
name: ccb-config
description: Private built-in CCB configuration skill for agentroles.ccb_self. Design, edit, validate, and prepare reloads for .ccb/ccb.config, role bindings, providers, windows, workspaces, tool windows, sidebar, and provider startup inputs. Use only inside ccb_self; non-self agents should delegate CCB config changes to ccb_self.
---

# CCB Config

This is the private `agentroles.ccb_self` built-in CCB configuration skill. It
owns `.ccb/ccb.config` design, editing, validation, reload readiness, and
affected-agent reporting. It is not a global inherited skill for non-self
agents.

Read `references/config-contracts.md` before complex edits or reload-impact
analysis.

The canonical skill name remains `ccb-config`. The full skill lives in this
Role source and must not also be stored in common inherited skill folders.

## Scope

Allowed:

- Edit project `.ccb/ccb.config`.
- Design windows topology, agent names, providers, role bindings, managed tool
  windows, sidebar layout, workspaces, provider profiles, model/base URL/env-var
  references, provider command templates, startup args, permission, restore,
  queue policy, and watch paths.
- Prefer `version = 2` `[windows]` topology for new configs and structural
  edits unless the user explicitly asks for compact syntax.
- Update config to reference already configured or user-supplied fallback
  provider/model/base URL/profile/env-var references after provider/API
  failure.
- Run `ccb config validate` after every edit.
- Review protected project command fields and record external exact-value
  approval with `ccb config approve-commands` only after explicit approval.
- Run `ccb reload --dry-run` before reload materialization.
- Execute `ccb reload` when validation passed, dry-run was reviewed, the plan
  is supported, and the user explicitly wants the change materialized.
- Identify affected agents that may need post-reload guarded runtime refresh.

Forbidden:

- Do not edit `.ccb/ccb_memory.md`, `.ccb/agents/<agent>/memory.md`, provider
  homes, installed role stores, generated memory, lifecycle, lease, runtime,
  mailbox, provider session, or tmux state.
- If the user asks for dynamic workflow roles, task lanes, or mounted-agent
  memory overlays, route to `ccb-workflow-orchestrate`; this skill still owns
  only `.ccb/ccb.config` and reload-readiness.
- Do not execute `ccb restart`, `ccb kill`, `ccb clear`, or `ccb repair` from
  this skill.
- Do not run raw tmux commands.
- Do not infer pane health from config.
- Do not read, print, store, search for, scrape, borrow, or use API keys.

## Project Command Trust Gate

The protected fields are `tool_windows.<name>.command` and
`agents.<name>.provider_command_template`.

Before startup or reload can execute either field:

1. Show the exact field and command value to the user without executing it.
2. Check that it matches the user's intended local tool or Provider launch.
3. With explicit approval intent, run:

```bash
ccb config approve-commands
```

4. Verify CCB accepted the external receipt, then continue with normal
   validation/reload gates.

Safe mode does not bypass this gate. Neither do script mode, validation,
project ownership, or a previous receipt for a different value. Never edit the
receipt store directly.

## Required Workflow

1. Resolve config source and target. Project config `.ccb/ccb.config` is the
   normal target; user config `~/.ccb/ccb.config` is out of scope unless the
   user explicitly asks.
2. Read current config and classify active shape: compact, hybrid, or
   `version = 2` `[windows]` topology.
3. Preserve existing agent names, provider choices, role bindings, worktree
   settings, labels, comments, and advanced overrides unless the user asks to
   change them.
4. Before editing an existing project config, create one dated pre-edit backup
   next to it, for example
   `cp .ccb/ccb.config .ccb/ccb.config.bak.$(date +%s)`. Restore only from the
   backup created for this edit.
5. Make the smallest disk edit that satisfies the user request.
6. If a protected command field exists or changed, complete the Project Command
   Trust Gate before any execution path.
7. Run:

```bash
ccb config validate
```

8. If validation fails, report the full validation error, do not run reload,
   and do not claim recovery is complete. Restore the previous config when a
   reliable pre-edit copy exists; otherwise stop and ask for the user's
   preferred correction or rollback.
9. If the user wants the change materialized and validation passed, run:

```bash
ccb reload --dry-run
```

10. Classify dry-run output:
   - no change
   - reloadable presentation/config change
   - role asset/tool materialization change
   - topology/provider/startup change with affected agents
   - blocked or unsupported reload
11. Execute `ccb reload` only when gates pass and materialization intent is
   explicit.
12. Re-check the mounted daemon graph after reload.
13. Report affected agents and hand post-reload runtime refresh decisions to
    `ccb-self-recover`.

## Affected-Agent Rules

Mark an agent as affected when the change may alter:

- provider command or command template
- provider profile or inherited provider configuration
- model, base URL, API route, or env-var reference
- role id, role version, memory, skill, prompt, or tool materialization
- workspace path or worktree mode
- startup args, permission, restore, queue policy, or watch paths

Do not restart affected agents from this skill. Return a handoff:

```text
Affected agents: ...
Reload status: ...
Needs recover check: yes|no
Reason: ...
Suggested next skill: ccb-self-recover
```

## Role Binding

Use canonical Role ids such as `agentroles.archi` and
`agentroles.ccb_self`. The project-local agent name remains the ask target.

Recommended binding:

```toml
[windows]
ops = "agentroles.ccb_self:codex"
```

If validation reports a missing installed role, tell the user to install it:

```bash
ccb roles install agentroles.ccb_self
```

Do not copy role memory or skills into `.ccb` manually.

## Reporting

Summarize:

- config source and disk path
- exact files changed
- validation result
- dry-run result
- whether reload was run
- affected agents
- blocked runtime actions for `ccb-self-recover`
