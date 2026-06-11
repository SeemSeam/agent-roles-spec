# CCB Role And Config System

Use this reference for `.ccb/ccb.config`, Role Pack loading, role binding,
validate/reload, and restart-impact questions.

## Current Config Line

Treat `version = 2` as the current config grammar. Historical config forms are
migration context, not the main recommendation for new structural edits.

## Config Sources

- Project config: `.ccb/ccb.config`
- User default config: host-specific default path
- Built-in defaults when neither exists

Disk config is desired state. The mounted daemon graph is live state after
startup or successful reload.

## Layout Shapes

- Compact layout text.
- Rich TOML.
- Hybrid compact-plus-TOML overlay.

For new structural project configs, prefer `version = 2` with `[windows]`
topology.

## Windows Topology Rule

With `[windows]`, window leaves are the canonical source for provider and
default workspace mode. `[agents.<name>]` tables are overlays and should not
repeat topology-owned `provider` or default `workspace_mode` fields.

Good role binding shape:

```toml
[windows]
ops = "agentroles.ccb_self:codex"
```

If extra agent fields are needed:

```toml
[agents.ccb_self]
role = "agentroles.ccb_self"
```

Do not duplicate `provider = "codex"` in the overlay when the window leaf
already owns provider selection.

## Config Validation And Reload

Every config edit must run:

```bash
ccb config validate
```

Before materializing:

```bash
ccb reload --dry-run
```

Run `ccb reload` only after validation passes, dry-run is understood, and the
user intended materialization.

## Restart Impact

Reload can change daemon graph intent. It may not refresh already-running
provider processes. After reload, affected agents may need guarded restart if
the change touched:

- provider command or command template;
- provider profile;
- model, base URL, environment, or API route reference;
- role id, role assets, memory, skills, prompts, or tools;
- workspace path or worktree mode;
- startup args, permissions, restore, queue policy, or watch paths.

Use `ccb restart <agent>` only for a current daemon-graph target after busy
checks pass. Do not restart all agents or mutate tmux directly.

## Role Commands

Common role commands:

```bash
ccb roles install agentroles.ccb_self
ccb roles add agentroles.ccb_self:codex
ccb roles doctor agentroles.ccb_self
ccb roles update agentroles.ccb_self
ccb roles sync <path>
```

Project-local ask target is usually `ccb_self`; stable role id remains
`agentroles.ccb_self`.
