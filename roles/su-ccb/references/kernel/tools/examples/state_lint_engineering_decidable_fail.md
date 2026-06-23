---
task_id: fixture-engineering-decidable-fail
spec_path: references/kernel/tools/examples/spec_lint_pass.md
spec_hash: 8f29eae826a6912cee017a75eb421622c4ae5e2b66345662898c80cad62e92ce
currentNode: review
status: reviewing
revision: 1
policy_profile: autonomous-batch
hotfixes_adopted: [decision_escalation_guard]
engineering_decidable_decisions:
  - id: ed-fail
    decision_ref: dec-fail
    touchpoint: U5_migration_backfill
    summary: Backfill rows without rollback proof.
    evidence_list:
      - dry-run reviewed
      - row count reviewed
    reversibility_class: reversible_with_rollback
    scope:
      class: module_local
      paths:
        - apps/ccb-console/server/prisma/**
      external_contract_impact: false
    tests_ref:
      - dry-run
    canonical_consistency:
      class: existing_kernel_direction
      changes_kernel_semantics: false
      required_decision_refs: []
    decided_by: claude
    created_at: 2026-04-27T00:00:00+08:00
---

# Fixture Engineering Decidable Fail
