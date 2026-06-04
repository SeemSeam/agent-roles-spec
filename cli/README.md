# CLI

The CLI is now a preview package-management surface. It is intentionally
smaller than the future mount/unmount runtime.

After the first PyPI preview release is published, install it with:

```bash
pipx install agent-roles
agent-roles --version
```

Current preview commands:

```bash
agent-roles list --json
agent-roles install agentroles.archi --json
agent-roles update agentroles.archi --json
agent-roles upgrade agentroles.archi --json
agent-roles upgrade --all --json
agent-roles sync . --json
agent-roles doctor agentroles.archi --json
agent-roles resolve agentroles.archi --json
```

`install` writes a Role into the local `.roles/installed` package store.
`update` refreshes one already installed Role and fails if the Role has not been
installed yet. `upgrade` is the user-facing update alias; `upgrade --all`
refreshes every installed Role.

Role JSON payloads include `version`, digest metadata, and `created_at` /
`updated_at` timestamps when the source `role.toml` provides them.

The repo-local `cli/agent-roles` wrapper and `python -m agent_roles` run the
same module. Host adapters should use `--json` and treat the human text format
as unstable.

Live `mount` and `unmount` commands remain deferred until the host adapter
contracts stabilize.
