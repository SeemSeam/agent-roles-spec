# Role Runtime Setup Skill

Date: 2026-06-15

## Purpose

Design a simple, source-safe way for a loaded Role to check and plan optional
runtime setup from inside the active agent/provider environment, while keeping
role configuration uninstall in the `agent-roles` or Host Adapter manager
layer.

The target user experience is:

```bash
agent-roles add frontend
# later, inside the target agent/provider window
role_setup
```

or, when surfaced by a Host Adapter:

```bash
agent-roles setup frontend
agent-roles unmount frontend
```

The important distinction is that `add` or `install` installs Role source
only. `role_setup` runs after the Role is loaded, where the current provider
home, provider-shared runtime path, project binding target, plugin projection
target, and MCP config target are discoverable. Unmount or role config
uninstall runs outside the agent, where Project Binding, projection records,
and mounted-instance ownership are available.

## Current Spec Analysis

The current Role spec already supports the source side:

- `tools/` can contain runbooks, scripts, explicit lifecycle notes, and tool
  manifests.
- `plugins/` can contain host-native plugin/template content.
- `adapters/` can document host-specific projection behavior.
- `contents.tool_manifests` can index machine-readable manifests such as
  `tools/mcp-tools.toml`.

The current spec intentionally does not support hidden runtime side effects:

- Role source is static and reviewable.
- Mounting a Role must not mutate Role source by default.
- Tool manifests are declarations, not permission grants.
- Hidden installer behavior in memory or prompt text is forbidden.
- Runtime installs, generated config, credentials, browser profiles, caches,
  screenshots, traces, AGY worktrees, provider state, and logs stay outside
  Role source.

Therefore `role_setup` should be a reviewable setup entrypoint carried by a
Role and executed inside the loaded provider for check/plan and Host Adapter
handoff. It should not be an automatic side effect of `agent-roles add`, and it
should not own role config uninstall.

## Naming Decision

Use `role-setup` for the skill folder and `role_setup` as the user-facing
command-like trigger.

Do not use `mcp_install` as the primary name because the lifecycle is broader
than MCP. It may cover:

- MCP server declaration checks;
- provider config projection;
- provider-shared runtime reuse across projects;
- project-private binding creation;
- provider bridge/router checks;
- plugin/template projection;
- private wrapper commands;
- browser/runtime package checks;
- AGY availability and worktree policy checks;
- repair of adapter-owned projection output;
- hints for manager-side role config uninstall.

Do not use `role_install` as the primary name because `agent-roles install`
already means source-store installation. Runtime setup happens after mount and
must remain distinct from source installation.

## Shape

Recommended Role source layout:

```text
role/
  role.toml
  skills/
    role-setup/
      SKILL.md
  tools/
    README.md
    mcp-tools.toml
    role_setup.py
  plugins/
    <role>-toolbox/
      mcp.json.template
  adapters/
    codex/README.md
    claude-code/README.md
    ccb/README.md
```

## Startup Flow

1. Host loads or mounts the Role.
2. Host projects memory/skills/prompts according to its adapter.
3. Host or user invokes `role_setup` in `check` mode.
4. The skill reads the installed Role's `role.toml`, `tools/README.md`,
   declared tool manifests, plugin templates, and adapter notes.
5. The script detects the current provider environment.
6. The script emits a setup plan:
   - provider and provider home;
   - target config path;
   - provider-shared runtime path;
   - missing packages or commands;
   - required secrets by name only;
   - project prerequisites;
   - project binding target;
   - provider bridge target;
   - generated files that would be owned by the Role projection;
   - manager lifecycle hints for setup ownership and later unmount.
7. Apply mode emits a Host Adapter handoff only after explicit approval or
   Project Binding policy.
8. The Host Adapter installs packages into provider-shared runtime and writes
   provider-specific bridge/project-binding projection output.
9. The Host Adapter or `agent-roles` manager records projection ownership
   outside Role source.
10. Repair handoff uses those projection records; unmount/remove-config runs
   from the manager layer, not from inside the agent.

## Modes

| Mode | Role script mutates state | Use |
| --- | --- | --- |
| `check` | No | Detect provider, manifests, provider-shared runtime, project binding target, config targets, missing secrets, missing commands. Safe at startup. |
| `plan` | No | Print exact proposed install/projection actions and manager lifecycle hints. |
| `apply` | No | Emit an approved Host Adapter handoff for provider-shared install/projection work. |
| `repair` | No | Emit an approved Host Adapter handoff to recreate missing projection output without changing Role source. |

Default mode should be `check` or `plan`, never `apply`.

`uninstall` is deliberately not a `role_setup` mode. Role config uninstall
requires manager-side visibility into Project Binding, mounted instances,
projection records, and other active windows.

## Provider Detection

The script should detect provider in this order:

1. Explicit flag from Host Adapter or user, such as `--provider codex`.
2. Host-provided environment variables such as `AGENT_ROLES_PROVIDER`,
   `AGENT_ROLES_PROVIDER_HOME`, `AGENT_ROLES_PROJECT_BINDING`, or
   `AGENT_ROLES_RUNTIME_ROOT`.
3. Current process/config markers:
   - Codex: `CODEX_HOME`, `~/.codex/config.toml`, or CCB provider-state Codex
     home.
   - Claude Code: project `.mcp.json`, Claude settings, or Claude project
     config.
   - CCB: `.ccb/agents/<name>/provider-state/<provider>/home`.
   - VS Code: user or workspace MCP config only when explicitly selected.
4. If ambiguous, stop and ask for provider/scope instead of writing config.

## Scope Rules

Default scope:

- `provider-shared` for packages, generated wrappers, bridge support, and
  reusable browser/runtime dependencies.
- `project-private` for project binding, selected files, URLs, enabled tools,
  and permission choices.
- current provider home only for the bridge/router projection, not for every
  MCP server individually.
- never `global` unless explicitly requested.

Forbidden by default:

- editing `~/.codex/config.toml` if a narrower provider-state config is active;
- editing `~/.config/claude/*` if a project `.mcp.json` is available;
- installing npm/pip packages globally;
- writing tokens or selected Figma files into generated config;
- storing project-specific URLs, selected Figma files/frames, or permission
  grants in provider-shared runtime;
- globally exposing every Role MCP server when a bridge/router can load only
  the current project's binding;
- writing generated output back into Role source;
- deleting provider/runtime files from inside the agent.

## Isolation And Projection Records

Every manager-side mutating setup must create projection ownership records
outside Role source. These records belong to `agent-roles`, Project Binding,
or the Host Adapter, not to the loaded agent. They should include:

- role id, role version, content digest if available, mounted instance id;
- provider and host adapter;
- runtime root and provider/project projection root;
- provider-shared runtime root;
- project binding path;
- provider bridge path;
- generated files and directories;
- install package names and private package cache roots;
- templates used as projection inputs;
- creation time and setup tool version.

Manager-side role config uninstall must read those records and remove only
paths that:

- belong to the same Role id and mounted instance;
- are inside allowed runtime/projection roots;
- are marked as adapter-owned projection output;
- do not contain credentials, user data, browser profiles, or project source
  files unless the adapter explicitly owns those generated files.

If no projection record exists, manager-side uninstall should report that
cleanup cannot be proven and should provide manual cleanup candidates without
deleting them.

## Script Contract

Input:

- `--role-root` or inferred installed Role root.
- `--mode check|plan|apply|repair`.
- `--provider auto|codex|claude-code|ccb|hive|vscode`.
- `--runtime-root` and `--provider-home` overrides for Host Adapters.
- `--json` for Host Adapters.

Output JSON should include:

- `role_id`, `role_version`, `role_root`;
- `provider`, `provider_home`, `config_target`;
- `provider_runtime_root`;
- `project_binding`;
- `provider_bridge`;
- `manifests`;
- `tools`: id, kind, status, install mode, required secret names, project
  prerequisites;
- `actions`: planned/applied/skipped;
- `projection_outputs`;
- `manager_lifecycle`: setup owner, uninstall owner, projection-record owner,
  and unmount command hint;
- `warnings`;
- `status`: `ok`, `needs_approval`, `needs_host_adapter`,
  `ambiguous_provider`, or `failed`.

## Skill Contract

`skills/role-setup/SKILL.md` should:

- trigger when the user asks to install, enable, activate, repair, or inspect
  runtime setup for the current Role;
- read local tool manifests, tool notes, plugin templates, and adapter notes
  before acting;
- run the script in `check` or `plan` first;
- summarize the setup plan before any mutation;
- require approval for `apply` and `repair`, unless Project Binding grants it;
- report exactly which provider config and runtime paths were touched;
- refuse to store secrets or generated state in Role source;
- route uninstall or role config removal to `agent-roles` or the Host Adapter
  manager layer instead of deleting files in the agent session.

## Host Adapter Responsibility

Host Adapters should be able to surface this as a single shallow setup action:

```bash
agent-roles setup frontend
```

Internally, that action may invoke the Role's `role-setup` skill/script in the
current provider context. It should not expose a public nested command tree such
as `agent-roles tools install`, `agent-roles tools doctor`, and
`agent-roles tools uninstall`.

Role config uninstall should be similarly shallow but manager-owned:

```bash
agent-roles unmount frontend
```

The unmount action should use agent-roles/adapter projection records and remove
only manager-owned projection output and private runtime files. It should not
invoke `role_setup` inside an agent as the cleanup authority.

## Frontend Role Application

For `agentroles.frontend_engineer`, the first version should support:

- `figma-mcp`: check only unless a token is already supplied by runtime env;
- `storybook-mcp`: project only when a Storybook URL/source is provided;
- `playwright-mcp`: provider-shared install or host-provided command;
- `chrome-devtools-mcp`: host-provided or provider-shared install;
- `context-docs-mcp` and `shadcn-mcp`: optional, stack-dependent;
- `style-dictionary`: only when the project has token pipelines;
- `agy`: check command availability and worktree policy, never install account
  state.

## Acceptance Criteria

- Running `role_setup --mode check --json` from a loaded Role never mutates
  files.
- Ambiguous provider detection stops with `ambiguous_provider` before mutation.
- `apply` from the role script emits an approved handoff only; the
  agent-roles/Host Adapter setup command writes provider-shared runtime files,
  project binding, and current provider/project projection output.
- Provider-shared runtime is reused across projects for the same provider and
  Role/tool manifest.
- Project-specific selected resources and enabled tools remain in project
  binding.
- Provider global config uses a bridge/router where possible instead of
  globally exposing every Role MCP server.
- No secrets appear in Role source, generated logs, JSON output, or plan-tree
  docs.
- `role_setup --mode uninstall` is not available.
- Manager-side `agent-roles unmount` or equivalent removes only outputs it can
  trace to the mounted Role through projection records.
- Existing `agent-roles add`, `check`, `install`, and `doctor` behavior remains
  backwards compatible.

## Open Questions

- Should the first complete `setup` implementation live in the frontend Role
  only, or as a reusable template skill for any Role with runtime setup needs?
- Should Project Binding define preapproval for `apply` and `repair`, or
  should v0.2 require interactive confirmation for every setup mutation?
- What environment variables should Host Adapters standardize for provider
  detection and runtime roots?
- Should the first manager-side role config uninstall command be
  `agent-roles unmount <role>`, `agent-roles remove-config <role>`, or a Host
  Adapter-only operation?
