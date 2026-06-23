---
title: su-flow entry sample trace
scenario: user invokes /ccb:su-flow for a new task
created: 2026-05-03
---

# Sample Trace: /ccb:su-flow

## User

```text
/ccb:su-flow

请把 README 的安装说明补齐，并给出可验证的验收命令。
```

## Skill trace

```yaml
entrypoint: /ccb:su-flow
policy_profile: interactive-single
currentNode: requirement_analysis
nodeSubstate: drafting
runtimeState: running
```

`/ccb:su-flow` loads the project index, state, and canonical node manifests. It
drives the plan-stage flow only: requirement analysis, technical design, and
task breakdown.

```yaml
currentNode: technical_design
nodeSubstate: ready
runtimeState: running
```

## Sample plan output

```text
需求摘要：
- 补齐 README 安装说明，保持现有文档结构。
- 给出用户可复制的验证命令。

技术边界：
- 不修改 installer 行为。
- 不新增依赖。
- 不改 references/kernel/。

任务切片：
1. 更新 README 安装段落。
2. 运行 markdown link check。
3. 运行 lint baseline。

dev_task_path: docs/03_开发计划/readme-install-docs-开发任务.md
currentNode: task_breakdown
nodeSubstate: dispatch_ready
runtimeState: running
next: /ccb:su-dispatch
```
