# CLI

The CLI is now a preview package-management surface. It is intentionally
smaller than the future mount/unmount runtime.

Current preview commands:

```bash
python -m agent_roles list --json
python -m agent_roles install agentroles.archi --json
python -m agent_roles update agentroles.archi --json
python -m agent_roles sync . --json
python -m agent_roles doctor agentroles.archi --json
python -m agent_roles resolve agentroles.archi --json
```

The repo-local `cli/agent-roles` wrapper runs the same module. Host adapters
should use `--json` and treat the human text format as unstable.

Live `mount` and `unmount` commands remain deferred until the host adapter
contracts stabilize.
