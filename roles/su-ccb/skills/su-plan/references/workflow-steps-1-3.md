# Step 1-3 工作流说明

> [v0.3.2-deprecated-reference]
> 本文档自 v0.3.2 起由 `references/kernel/nodes/requirement_analysis.node.md`、`technical_design.node.md`、`task_breakdown.node.md` 取代。
> 保留本文只为历史对照；执行规则必须引用 node manifest 的 `fixed_actions` / `subflows`。

## Step 1：需求分析
- 目标：充分理解需求，建立共识。
- 质量优先，深度思考，充分对话。
- 简单任务：快速理解后直接准备写 spec。
- 中等任务：需要澄清与功能拆解，通常需要需求文档。
- 复杂任务：范围大、链路复杂或高风险，需要详细需求文档。

### 协商（自动触发）
- 当需求涉及代码现状理解、可行性判断时，向 Codex 发起 `mode: consult` 协商。
- 若 Codex 回复 `analysis_depth_hint=sc-brainstorm`，触发 `/sc:brainstorm`。
- Claude 把控轮次（soft=3, hard=5），协商结论纳入需求分析输出。

### 输出
- 需求理解
- 澄清问题
- 协商结论摘要（如有协商轮次）
- 必要时的 `docs/02_需求设计/*.md`

## Step 2：技术设计
- 先读 `docs/00_项目总览.md`、`docs/00_文档地图.md`、`docs/.ccb/docs-structure-contract.yaml`，再按契约定位相关架构、模块规格、ADR 与需求/任务文档。
- 做多方案对比。
- 明确关键决策、风险点和选择理由。

### 协商（自动触发）
- 向 Codex 发起技术方案协商：收集实现可行性、隐藏耦合、迁移成本、爆炸半径分析。
- 根据 Codex 回复中的 `analysis_depth_hint` 触发对应 SuperClaude 命令：
  - `sc-design` → `/sc:design`
  - `sc-analyze` → `/sc:analyze --focus [security|performance]`
  - `sc-spec-panel` → `/sc:spec-panel`（≥2 可行方案 + 高影响权衡）
  - `sc-estimate` → `/sc:estimate`
  - `human-decision` → 升级给用户，不触发 SC
- 设计确认后冻结方案。

### 输出
- 技术方案摘要
- 协商结论摘要（如有协商轮次）
- 必要时的 `docs/03_开发计划/*技术设计.md`

## Step 3：任务切片
- 判断任务模式：
  - 实施模式：目标和边界已冻结
  - 半开放实施：默认模式，Claude 冻结边界，Codex 自主内部实现
  - 勘探模式：先返回现状、风险、建议切分和待拍板问题
- spec 控制在 20-50 行。
- 要明确：
  - 本轮只做什么
  - 本轮不要做什么
  - 哪些情况必须回抛
  - 验收标准

## 审批门
- Step 1 后为 🔴 必审。
- Step 2 后为 🔴 必审。
- Step 3 后为 🟡 可审。

## 快速模式
- 只有用户显式要求时，🟡 可审节点才可自动放行。
- 涉及数据结构、权限、事务链路、跨模块依赖、高风险链路时，不自动放行。

## 高影响决策
以下事项必须回抛给 Claude：
- 外部接口契约变化
- 数据结构变化
- 跨模块依赖新增
- 状态流或事务流变化
- 大范围重构
- 改动范围明显扩大
- 与现有设计冲突
- 验证方式需要明显升级
