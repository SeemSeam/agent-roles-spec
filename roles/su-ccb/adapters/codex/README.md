# Codex Adapter Notes

Codex should consume the executor-facing parts of this Role.

## Supported Content

- `skills/ccb-execute`
- `skills/ccb-doc`
- The references and scripts nested inside those skills.
- `templates/codex-md-template.md` when an adapter wants to project Codex-side
  memory.

## Execution Boundary

`ccb-execute` is the Codex-side implementation, exploration, and consultation
surface. It expects Claude or another coordinator to provide a CCB task with
mode, scope, spec paths, validation expectations, and receipt requirements.

Codex must not create or remove SU-CCB worktrees on its own. It consumes
dispatch-created worktree state and follows the bundled validation and
commit-guard scripts.

## Unsupported Behavior

Project-global topology, actual permission grants, target agent names, and
callback behavior are not Role source. They must be represented by the active
host binding or CCB runtime configuration.
