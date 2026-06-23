# 协商契约（Consult Contract）

> schema_version: consult-v1

## 概述

协商是 CCB 的一等模式，在 Step 1（需求分析）和 Step 2（技术设计）阶段由 Claude 发起。
Codex 在协商模式下只读/分析/推理，不修改代码，不创建文件。

## 协商请求格式

```markdown
## Consultation: [topic]

### Meta
- schema_version: consult-v1
- mode: consult
- stage: step1|step2
- round: N
- soft_max_rounds: 3
- hard_max_rounds: 5
- task_id: xxx

### Objective
- goal: [Claude 在本轮协商中要决策的内容]
- decision_scope: architecture|implementation-strategy|feasibility|risk-analysis|debugging
- expected_depth: brief|standard|deep

### Confirmed Context
- confirmed_conclusions:
  - [共识 1]
  - [共识 2]

### Open Questions
1. [问题 1]
2. [问题 2]

### Constraints
- [约束 1]
- [约束 2]

### Non-goals
- [明确排除项]

### Relevant Sources
- spec_paths:
  - [path]
- doc_paths:
  - [path]
- code_paths:
  - [path]

### Delta Since Last Round
- [新事实 / 变更假设 / 排除选项]  （round > 1 时必填）

### Allowed Actions
- read_code_and_docs: yes
- run_analysis_commands: yes|no
- modify_files: no
- create_files: no

### Response Contract
按照协商回复格式回复。
```

## 协商回复格式

| 字段 | 必填 | 说明 |
|------|------|------|
| `mode` | 是 | 固定为 `consult` |
| `status` | 是 | `answered` / `needs-clarification` / `blocked` / `insufficient-context` |
| `understanding` | 是 | Codex 对本轮问题的理解 |
| `findings` | 是 | 从代码/文档中发现的相关事实（证据先行） |
| `options` | 是 | 可行方案列表 |
| `recommendation` | 是 | 推荐方案 |
| `rationale` | 是 | 推荐理由 |
| `risks` | 是 | 主要风险/失败模式（≤3 条） |
| `assumptions` | 是 | 本回答依赖的假设 |
| `open_questions` | 是 | Claude 或用户仍需决策的问题 |
| `analysis_depth_hint` | 是 | 建议 Claude 触发的深度分析类型 |
| `hint_reason` | 条件 | hint 非 `none` 时必填 |
| `hint_confidence` | 条件 | hint 非 `none` 时必填 |

## 回复状态值定义

| Status | 含义 |
|--------|------|
| `answered` | 已提供本轮充分回答 |
| `needs-clarification` | 问题描述不够具体，需要 Claude 补充 |
| `blocked` | 需要用户/Claude 决策或缺少前置条件 |
| `insufficient-context` | 仓库/文档不提供足够证据 |

## analysis_depth_hint 枚举

```
none              - 无需深度分析
sc-brainstorm     - 建议发散式探讨
sc-design         - 建议架构级分析
sc-analyze        - 建议代码/性能/安全分析
sc-research       - 建议外部信息检索
sc-spec-panel     - 建议多专家评审
sc-estimate       - 建议工作量评估
sc-troubleshoot   - 建议问题诊断
human-decision    - 需要用户介入决策
```

## hint_confidence 标准

| 等级 | 含义 | 赋值条件 |
|------|------|---------|
| `low` | 有帮助但可选 | 单一关切、可逆决策、局部影响 |
| `medium` | 可能有益 | ≥2 可行选项、中度模糊、跨文件/模块效果 |
| `high` | 强烈建议 | 高影响架构选择、关键路径风险、证据不足 |

## evidence-before-conclusion 原则

Codex 在协商模式下**必须**遵循"证据先行"原则：

1. **findings 先行**：先列出从代码/文档中发现的相关事实
2. **options 其次**：基于 findings 列出可行方案
3. **recommendation 再次**：基于 options 给出推荐
4. **risks/assumptions 最后**：明确限制条件

不得从直觉直接跳到建议。缺少证据时，`status` 应为 `insufficient-context`。

## 上下文传递规则

Claude 每轮传递：
- 原始目标（不变）
- 已确认结论（累积，≤8 条）
- 仍开放问题（仅当前未解决项）
- 上轮变化（round > 1 时必填）
- 相关源路径

Claude 不传：
- 完整的前 N 轮文本记录
- 已接受或已拒绝的重复论点

## 与执行模式的关系

协商是 `ccb-execute` 的非变更分支：
- 共享传输格式和输入风格
- 共享代码阅读行为
- 不共享变更、验证、回执语义
- 未来如果协商发展为独立工作流，可升级为独立 skill `ccb-consult`
