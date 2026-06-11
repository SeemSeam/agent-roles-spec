# CCB Project Index

This is the first reference for CCB expert questions.

## Public Source

- GitHub: `https://github.com/SeemSeam/claude_codex_bridge`

Use the public upstream URL as a source anchor and freshness fallback when the
host allows network access. Prefer a local checkout for exact behavior because
local branches may contain unreleased or dirty changes.

## Local Checkout Rule

When running inside a CCB source checkout, resolve source paths relative to the
project root. Do not hardcode machine-specific absolute paths.

Useful local discovery commands:

```bash
git remote -v
git status --short
git log --oneline -n 20
rg -n "<command_or_symbol>" lib docs tests
```

## Authority Layers

- Contract docs and current source define expected behavior.
- `.ccb/ccb.config` defines desired topology and startup intent.
- The mounted `ccbd` daemon graph defines live runtime authority.
- CLI observer commands expose live and persisted state.
- Logs, tmux panes, provider sessions, pid files, artifacts, and old runtime
  directories are evidence or residue.
- Plan-tree records design intent and rollout state, not necessarily released
  behavior.

## Answer Rules

- Use repo-relative paths in answers.
- Say whether the evidence is source, contract, manual, plan, test, release,
  or live runtime.
- Use local source/docs/tests before memory for exact behavior.
- If the worktree is dirty, separate landed behavior from local changes.
- If upstream freshness matters and network is unavailable, report that
  upstream could not be checked.
