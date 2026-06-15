# CLI

The CLI is now a preview package-management surface. It is intentionally
smaller than the future mount/unmount runtime.

After the first PyPI preview release is published, install it with:

```bash
pipx install agent-roles
agent-roles --version
```

Daily commands:

```bash
agent-roles list
agent-roles add archi
agent-roles check archi
agent-roles update archi
```

`add` writes a Role into the local `.roles/installed` package store. `check`
reports whether a Role is available and installed. `update` refreshes one
already installed Role and fails if the Role has not been installed yet.

Compatibility and automation commands:

```bash
agent-roles install agentroles.archi --json
agent-roles upgrade agentroles.archi --json
agent-roles upgrade --all --json
agent-roles sync . --json
agent-roles doctor agentroles.archi --json
agent-roles resolve agentroles.archi --json
```

`install` is the compatibility name for `add`; `doctor` is the compatibility
name for `check`. Host adapters should use `--json` and treat the human text
format as unstable. `upgrade --all` refreshes every installed Role.

Role JSON payloads include `version`, digest metadata, and `created_at` /
`updated_at` timestamps when the source `role.toml` provides them.

The repo-local `cli/agent-roles` wrapper and `python -m agent_roles` run the
same module.

Live `setup`, `mount`, and `unmount` commands remain deferred until the Host
Adapter contracts stabilize. Role-private MCP/tool setup should be one
provider-aware action when it lands, not a nested `tools` command tree.
