# su-plan SC 集成

> [v0.3.2-deprecated-reference]
> 本文档自 v0.3.2 起由节点 manifest 取代；v1.0 起 manifest 形态为 `references/kernel/nodes/*.node.md`（旧 `.node.yaml` 已退役）。capability 声明仍由 `references/kernel/capabilities/global.yaml` 提供。
> 保留本文只为兼容对照；SuperClaude 调用不再作为独立工作流规则来源。

## 必须触发
| SC 命令 | 触发条件 |
|---------|---------|
| `/sc:design [目标摘要]` | 进入 Step 2 技术设计的协商前 |

## 条件触发（由协商回复中的 analysis_depth_hint 驱动）
| Codex hint | SC 命令 | 触发规则 |
|------------|---------|---------|
| `sc-brainstorm` | `/sc:brainstorm` | Step 1，需求仍模糊/目标冲突/范围未拆解 |
| `sc-design` | `/sc:design` | 架构边界/模块拆分/接口设计需深度推理 |
| `sc-analyze` + security | `/sc:analyze --focus security` | 安全风险高影响且影响设计选择 |
| `sc-analyze` + performance | `/sc:analyze --focus performance` | 性能在关键路径 |
| `sc-spec-panel` | `/sc:spec-panel` | ≥2 个可行设计 + 权衡高影响或跨模块 |
| `sc-estimate` | `/sc:estimate` | 需要规模估算来决定拆分/顺序/资源 |
| `sc-troubleshoot` | `/sc:troubleshoot` | 协商主题是故障诊断 |
| `sc-research` | `/sc:research` | 缺失信息是仓库和文档之外的外部信息 |
| `human-decision` | **不触发 SC** | 升级给用户 |

## 建议触发
| SC 命令 | 触发条件 |
|---------|---------|
| `/sc:spec-panel [spec 路径]` | 方案需多专家审查 |
| `/sc:workflow [PRD 路径]` | 任务复杂需结构化工作流 |
| `/sc:estimate [任务描述]` | 需要工作量评估 |
