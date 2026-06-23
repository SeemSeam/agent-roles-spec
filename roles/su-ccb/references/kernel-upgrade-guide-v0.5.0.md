# Kernel Upgrade Guide: v0.5.0

> ⚠️ **历史升级指南**：v0.5.0 引入的三层（Epic）层级协议已被 ADR-0028 两层模型取代，v1.0 主线不再启用，当前 kernel 已完成实体级 Epic 协议退役。本指南保留作 v0.5.0 协议快照的历史参考。

## Scope

v0.5.0 introduces the hierarchy protocol required by the console three-tier model.

## Required Steps

1. Install or update this plugin to tag `v0.5.0`.
2. Refresh the project kernel snapshot from the plugin distribution.
3. Run kernel lint in the target project:

```bash
python3 references/kernel/tools/lint_manifest.py
python3 references/kernel/tools/lint_all.py
```

4. Run the console migration dry-run before enabling new task writes.
5. Review migration output. Records below the confidence threshold must have `migration_reviewed_by` and `migration_reviewed_at` before apply.

## Kernel Snapshot Sync

The plugin carries `references/kernel/` as a distribution snapshot. Project refresh must replace the full snapshot atomically; do not merge individual files by hand.

## Historical Task Migration

Migration scripts should classify existing Task rows with dry-run audit output:

- explicit spec frontmatter or roadmap child -> `epic`;
- task key containing `redesign|epic|initiative|consolidation|three-tier|master-roadmap` -> `epic`;
- PR/slice/fix/rfc patterns -> `subtask`;
- shared prefix with known Epic -> `subtask` with `parent_epic_id`;
- undecided -> manual review.

Apply only after dry-run high-confidence coverage meets the console migration gate.

## Rollback Notes

The protocol stores `legacy_kind`, `legacy_parent_hint`, and migration audit fields so console-side migration can produce reversible reports. Kernel files themselves should roll back by checking out the previous plugin tag.
