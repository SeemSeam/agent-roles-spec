---
schema_version: ccb-kernel-index-v1
status: active
introduced_by: ADR-0030
updated_at: 2026-05-21
---

# CCB Kernel Index

`references/kernel/` 是 plugin 内 AI 协作规则的入口。ADR-0030 之后，节点 manifest 从旧 YAML 调度范式迁移为 AI 可读的 Markdown 工作模式说明。

## 当前主入口

| 文件 | 作用 |
|---|---|
| `glossary.md` | 术语小词典，防止用户和 AI 因术语理解不同而漂移 |
| `must-ask-checklist.md` | 12 类必须问用户的事项、PoC 放宽边界和命中判定 |
| `document-expression-spec.md` | 落档表达规范：R1-R6 规则、doc_type 应用矩阵、豁免语义；分析/设计/拆分落档前消费 |
| `nodes/*.node.md` | 7 个业务节点的新 Markdown manifest |
| `decision-card-schema.yaml` | v1.5+ Decision Card 结构化 schema 占位 |
| `agent-reply-reviewed-schema.yaml` | v1.5+ agent reply reflection schema 占位 |
| `state-schema.yaml` | 历史状态字段定义，仍作为兼容参考 |
| `registries/*.md` / `registries/*.yaml` | lint 使用的 transition、guard、manifest schema registry |

## 7 个节点 manifest

| 节点 | 新 manifest |
|---|---|
| requirement_analysis | `nodes/requirement_analysis.node.md` |
| technical_design | `nodes/technical_design.node.md` |
| task_breakdown | `nodes/task_breakdown.node.md` |
| dispatch | `nodes/dispatch.node.md` |
| implementation | `nodes/implementation.node.md` |
| review | `nodes/review.node.md` |
| archive | `nodes/archive.node.md` |

每个 manifest 都采用 ADR-0030 的 6 段格式：

1. 什么时候进入这个模式
2. 进入后大概怎么做
3. 什么时候算完成
4. 不能干什么
5. 推荐的 sc 指令
6. 好 / 中等 / 坏输出样例

## Live registries

`registries/transition-table.md`、`registries/guard-registry.md`、`registries/node-manifest-schema.yaml` 仍由 kernel lint 消费。旧 `.node.yaml` 节点定义与 capability registry schema 已退役，不再随 active kernel 保留。

## 阅读顺序

| 读者 | 推荐顺序 |
|---|---|
| 用户 / 产品审查 | `glossary.md` → `must-ask-checklist.md` → 目标节点 `.node.md` |
| Claude 主驾驶 | 当前 SKILL.md → 目标节点 `.node.md` → `must-ask-checklist.md` |
| Codex 协商 | 目标节点 `.node.md` → spec / dispatch brief → EventJournal |
| 实施者 | SKILL.md → 节点 `.node.md` → 相关 spec / draft / state 文件 |

## 不变量

1. 新业务节点规则写在 `.node.md`，不写在旧 YAML schema。
2. SKILL.md 是意图入口和节点集声明，不复制节点内部规则。
3. plugin 直接读写 `docs/.ccb/` 真相源，Console 只做触发和投影。
4. v1.x 任一业务节点都必须最少 1 轮 agent 协商 + 4 锚点反思。
5. 命中 `must-ask-checklist.md` 的事项必须前置问用户。
