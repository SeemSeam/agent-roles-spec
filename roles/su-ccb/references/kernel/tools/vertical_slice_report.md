---
status: partial
scope: v0.3.2 vertical slice / requirement_analysis
source_manifest: ../nodes/requirement_analysis.node.md
simulator: simulate_node.py
---

# v0.3.2 垂直切片验收报告

本报告覆盖 `requirement_analysis.node.yaml` 的模拟执行切片。模拟器只读取 manifest 与 capability registry，不执行 primitive，不调用外部 provider；真实运行项保留给 v0.3.2 部署后的人工验证。

## Simulator Case 结果

| case | 期望行为 | simulator 实际行为 | 结果 |
|---|---|---|---|
| simple-success | 简单任务在 interactive-single 模式跑到 `step1_approval_when_interactive`，完成节点并选择 `requirement_analysis__on_done__to__technical_design` | `outcome=completed`，`subflow_triggered=False`，`transition=requirement_analysis__on_done__to__technical_design` | PASS |
| consult-needed | 多方案任务触发 `consult_requirement_scope` subflow，关闭 red flags 后完成节点 | `outcome=completed`，`subflow_triggered=True`，`transition=requirement_analysis__on_done__to__technical_design` | PASS |
| missing-must-have | `analysis.consult`（历史名：`independent_requirement_review`）不可用时按 must_have escalates | `outcome=escalate`，`transition=requirement_analysis__escalate__to__terminal` | PASS |
| missing-governance-critical | `gate.user_confirmation` 不可用时不能静默跳过，转入 escalation transition | `outcome=escalate`，`transition=requirement_analysis__escalate__to__terminal` | PASS |

## DoD 状态

| # | DoD | 状态 | 说明 |
|---|---|---|---|
| 1 | manifest 通过 lint | yes | `lint_manifest.py` 跑 7 份 manifest：`ALL_GREEN: yes` |
| 2 | simulator 负向用例全部按预期 escalate / fail | yes | `missing-must-have` escalate；`missing-governance-critical` escalate |
| 3 | simulator 正向用例输出符合 contract | yes | `simple-success` 与 `consult-needed` 均进入 `technical_design` transition |
| 4 | real run 写出 summary artifact 到 `docs/02_需求设计/<task>.md` 或关联 dev_task frontmatter / 正文 | pending | 需要 v0.3.2 部署后手动跑真实任务 |
| 5 | real run 的 `last_transition_id` 等于 `requirement_analysis__on_done__to__technical_design` | pending | 依赖真实节点执行与 state 写入 |
| 6 | 全程没有 governance-critical capability 被静默跳过 | yes | simulator 对缺失 critical capability 明确输出 escalate / hard_fail |
| 7 | Console API 能读到 `currentNode = technical_design` | skip | 依赖 real run 产生状态后再验证 |

## 结论

状态为 PARTIAL/PENDING：manifest lint 与 simulator 垂直切片已通过；真实运行、`last_transition_id` 写入、Console API 读回由用户在 v0.3.2 部署后手动验证。
