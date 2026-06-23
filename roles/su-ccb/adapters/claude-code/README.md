# Claude Code Adapter Notes

Claude Code may consume this Role by projecting the coordinator skills into a
Claude-side command or skill namespace.

## Supported Content

- `skills/su-flow`
- `skills/su-init`
- `skills/requirement-reanalyze`
- `skills/su-approve`
- `skills/su-archive`
- `skills/su-batch`
- `skills/su-cancel`
- `skills/su-defer`
- `skills/su-dispatch`
- `skills/su-materialize-requirement`
- `skills/su-plan`
- `skills/su-quick-archive`
- `skills/su-reactivate`
- `skills/su-reconcile`
- `skills/su-resume`
- `skills/su-review`
- `skills/su-revise-breakdown`
- `skills/su-status`
- `lib/`, `references/`, and `templates/` needed by those skills.
- `plugins/claude-ccb` as a Claude plugin manifest snapshot.

## Projection Boundary

If a Claude adapter needs the native `.claude-plugin/` directory shape, it
should generate that directory as projection output from `plugins/claude-ccb`.
Do not write `.claude-plugin/` back into the Role source directory.

Project-specific CCB agent names, CCB runtime config, approved permissions, and
working-directory scope are Project Binding concerns.

## Unsupported Behavior

Claude Code alone does not make the Codex execution side available. If no
Codex executor and no CCB bridge are bound, coordinator skills must report that
dispatch, execution, consultation, or receipt collection cannot proceed.
