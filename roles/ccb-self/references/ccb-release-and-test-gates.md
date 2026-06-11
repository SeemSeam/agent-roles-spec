# CCB Release And Test Gates

Use this reference to answer whether a CCB feature is planned, implemented,
tested, released, or only present in local changes.

## Status Labels

- `planned`: documented in plan-tree, not necessarily in source.
- `implemented in dirty tree`: source changed locally but not committed.
- `implemented`: committed in local branch.
- `tested`: relevant automated or runtime validation passed.
- `released`: included in the release branch/tag or published package under
  discussion.

Never collapse these labels. Dirty local behavior is not released behavior.

## Local Evidence Commands

```bash
git status --short
git diff --name-status
git log --oneline -n 20
rg -n "<feature_or_command>" lib docs tests
```

Use `git branch --show-current` and `git remote -v` when branch or upstream
context matters.

## Source Runtime Validation Discipline

When validating CCB source runtime behavior from the CCB source project, do not
use the source checkout itself as the live runtime directory. Use the project's
documented external source-test directory and isolated provider/account home.
If those project-specific paths are unknown, read the repo-local `AGENTS.md`
and source-runtime isolation docs before running runtime validation.

For unit tests, prefer targeted pytest commands first, then broader suites when
the change crosses contracts or shared behavior.

## Common Test Routing

- CLI parser/router/services: search `test/` for the command name.
- Config loader and validation: search `test/` for `config_loader`,
  `config validate`, `style_warnings`, or specific config keys.
- Role Pack behavior: search `test/` for `rolepacks`, `roles add`,
  `roles install`, `projection`, or `agentroles`.
- Communication: search `test/` for `ask`, `trace`, `queue`, `inbox`,
  `callback`, `repair`, `retry`, `resubmit`, `ack`, or `message_bureau`.
- Restart/reload: search `test/` for `restart`, `reload`, `busy`, or
  `project_restart`.

## Release Answers

When answering "is this in release X":

1. Check branch/tag context.
2. Check commit history and changelog/release docs.
3. Check whether the relevant tests passed.
4. Say if the evidence only proves local implementation.
5. Give the exact command or file path the user can use to verify.
