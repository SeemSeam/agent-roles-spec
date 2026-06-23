---
spec_id: fixture-spec-pass
task_id: fixture-spec-pass
mode: execute
---

# Spec: Fixture Spec Pass

## 目标

Provide a compact measurable dispatch contract.

## 硬约束

- Must not touch kernel canonical files.

## 不做

- Do not add runtime dependencies.

## 验收

1. Lint exits with code 0.
2. At least 1 fixture passes.
