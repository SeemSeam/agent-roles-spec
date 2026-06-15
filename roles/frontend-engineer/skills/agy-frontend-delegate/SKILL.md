---
name: agy-frontend-delegate
description: Use when the user wants Google Antigravity CLI (`agy`) to attempt or compare a bounded frontend implementation in an isolated worktree, with diff review before merge.
---

# AGY Frontend Delegate

Use this skill when Antigravity CLI delegation would improve frontend
implementation, comparison, or alternate design exploration.

## Workflow

1. Prepare a bounded task brief with target surface, files, constraints,
   forbidden changes, acceptance criteria, and verification expectations.
2. Delegate through direct `agy` usage or an explicitly configured bridge only
   when the host/user environment already supports it.
3. Require an isolated worktree, branch, or equivalent review boundary.
4. Treat AGY output as a candidate diff, not an accepted implementation.
5. Inspect diffstat, changed files, tests, browser behavior, accessibility, and
   design-system fit.
6. Recommend merge, revise, or discard. Merge only when the user or host
   workflow explicitly approves it.

## Output

Return:

- delegation brief
- changed files and diff risk summary
- verification performed
- merge/revise/discard recommendation
- unresolved risks

Do not store AGY provider state, conversations, worktree paths, branches, logs,
or generated diffs in Role source.
