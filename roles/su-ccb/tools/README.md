# SU-CCB Role Tools

This Role carries tool and runtime source used by the bundled skills.

## Included Source

- `lib/`: JavaScript helper modules for governed writes, CAS hashes, file
  locks, schema validation, EventJournal events, draft transitions, task state,
  requirement analysis, cancellation, review status, reconcile, routing, and
  worktree lifecycle.
- `scripts/`: generator scripts for validators and capability outcome policy.
- `templates/`: project initialization templates, including Claude/Codex
  memory templates, docs templates, CCB config templates, and Claude hook
  templates.

## Tool Boundary

These files are Role source. Hosts may copy, link, or project them into a
managed runtime location when mounting the Role, but generated runtime output
must not be written back into this directory.

The Role does not install global tools by itself. A CCB-compatible runtime
still needs `claude_codex_bridge` / `ccbd`, a Claude surface, a Codex surface,
and Node.js available where helper scripts are executed.

## Network And Localhost

Some helpers can best-effort notify a local Console projection endpoint on
`127.0.0.1`. Console notification is projection support, not the business
truth source. Failure to notify Console must not overwrite or weaken canonical
file-state rules.
