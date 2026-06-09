# CCB Config Contracts

Use this reference for private `agentroles.ccb_self` config work.

## Authority

- Config precedence is built-in default, then user `~/.ccb/ccb.config`, then
  project `.ccb/ccb.config`.
- `.ccb/ccb.config` is the normal project topology/config authority on disk.
- Disk config is intent, not live graph. The mounted daemon graph becomes live
  authority only after a successful reload/start and recheck.
- `.ccb_config/ccb.config` is legacy migration evidence only.

## Validation And Reload

Every edit requires:

```bash
ccb config validate
```

Every reload requires a preceding no-mutation plan:

```bash
ccb reload --dry-run
```

`ccb reload` may run only after validation passes, dry-run is reviewed, the plan
is supported, and the user asked to materialize the change. Reload does not
prove already running provider processes picked up new startup inputs.

## Windows Topology

Prefer:

```toml
version = 2
entry_window = "main"

[windows]
main = "main:codex"
ops = "agentroles.ccb_self:codex"

[tool_windows.neovim]
command = "ccb-nvim"
label = "neovim"
```

Rules:

- `[windows]` defines the configured-agent set.
- Each agent leaf appears exactly once.
- `cmd` is not valid inside `[windows]` topology.
- `[agents.<name>]` tables are overlays for names referenced in `[windows]`.
- Stale `[agents.<name>]` tables are residue when the name is no longer in
  `[windows]`.

## Role Bindings

- Use canonical role ids such as `agentroles.archi` and
  `agentroles.ccb_self`.
- Shorthand `agentroles.ccb_self:codex` resolves to the role manifest default
  agent name when installed.
- Explicit binding may use a local name:

```toml
[windows]
ops = "ccb_self:codex"

[agents.ccb_self]
role = "agentroles.ccb_self"
provider = "codex"
```

If the role is missing, tell the user to run `ccb roles install <role-id>`.
Do not copy role assets into `.ccb` by hand.

## Provider/API Fallbacks

Use only existing configured fallbacks or user-supplied safe references such as
environment variable names, provider profiles, model names, or base URLs.
Never read, print, store, obtain, scrape, borrow, or use credential values.

Provider/startup-affecting changes require post-reload affected-agent recheck.
If a running provider process still reflects old inputs, hand the target to
`ccb-self-recover` for guarded single-agent restart when supported.
