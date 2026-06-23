---
spec_id: fixture-spec-warn
task_id: fixture-spec-warn
mode: execute
---

# Spec: Fixture Spec Warn

## 目标

Exercise warning-only implementation path references.

## 硬约束

- The implementation may inspect `apps/demo/src/example.ts`.

## 不做

- Do not change schemas.

## 验收

1. The warning fixture still exits with code 0.
