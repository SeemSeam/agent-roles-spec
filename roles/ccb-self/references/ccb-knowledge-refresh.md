# CCB Knowledge Refresh

Use this reference when `ccb_self` knowledge may be stale after source,
manual, role, release, or incident changes.

## Refresh Triggers

- The user asks to refresh CCB knowledge.
- A CCB feature lands or is pushed.
- Release validation completes.
- A recurring runtime incident exposes a new failure class.
- Role assets, built-in skills, manuals, or CCB contracts change.
- The `ccb_self` role version increments. Check memory, skills, references,
  tests, and adapter notes for stale behavior assumptions.

## Inputs

Collect only what is needed:

```bash
git status --short
git diff --stat
git log --oneline -n 20
rg -n "<feature_or_incident>" lib docs tests roles
```

Also check:

- `docs/plantree/` for plan status and decisions;
- `docs/manuals/` for talk1 manual changes;
- `docs/` contract files for authority updates;
- relevant tests and runtime incident artifacts;
- role source under `roles/ccb-self/`.

## Update Rules

- Update role references when source maps, command surfaces, manual paths, or
  workflow facts change.
- Update role memory only when identity, authority, hard boundaries, or routing
  rules change.
- Update skills only when the procedure changes, not when only facts change.
- Keep references concise; do not copy whole source files or long manual
  chapters.
- Preserve public-source portability by using repo-relative paths, not
  machine-specific absolute paths.

## Output

Report:

- changed knowledge files;
- source/manual/test evidence used;
- status label: planned, dirty-local, implemented, tested, or released;
- follow-up validation needed.
