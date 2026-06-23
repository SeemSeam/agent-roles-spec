---
node_id: dispatch
node_name: Dispatch
schema_version: ccb-node-manifest-md-v1
introduced_by: ADR-0030
status: active
---

# 节点：派工

## ① 什么时候进入这个模式？

**触发意图**（满足任一即进入）：

1. 用户确认 breakdown draft，子任务已经 materialize。
2. 用户说“派工”“启动实现”“让 Codex 做这个子任务”。
3. 某个 DeliveryUnit 已有明确 spec，可以进入 execution。
4. 批量派工时，需要逐个子任务形成清晰派工 brief。
5. Review 回退后，需要重新派发修复任务。

**AI 自判原则**：

派工节点解决的问题是“让执行 agent 准确知道做什么、不做什么、怎么回执”。派工不是简单发一句“请实现”，而是建立执行契约。

**降智期提醒**：

不要把设计文档整段丢给 Codex。执行者需要的是目标、边界、文件范围、验收、禁止事项和回执要求。

## ② 进入后大概怎么做？

**必须覆盖的核心要点**：

1. 读取目标子任务 spec 和 Requirement 上下文。
2. 核对该子任务是否已满足派工前置：范围清楚、验收明确、依赖已就绪。
3. 草拟 dispatch brief：目标、范围、禁止事项、验证命令、回执格式。
4. 使用推荐 sc 指令检查 brief 是否可执行。
5. 找 Codex 协商，让 Codex 从执行者视角指出不清楚或不可执行之处。
6. 写 4 段反思，并修订 brief。
7. 扫描必问项：owner、优先级、风险授权、公共 API 或依赖变更。
8. 派工提交前读取 dev_task 的 `code_workspace`，在 canonicalRoot（主仓）调用 `ensureRequirementWorktree` 展开并就绪该需求名下全部实施空间（按项目机器可读声明展开；无声明时为单一主空间）；该调用必须发生在 `ccb ask` 之前，且可重复幂等执行。
9. 通过 ccbd/ask 路径提交给目标 agent，或写入可执行派工文件等待提交。
10. 记录 dispatch_submitted、dispatch_failed 或 dispatch_deferred。
11. 给用户展示派工摘要和可追踪 id。
12. 提交派工前执行拍板项扫描约定 v1；在手文件 = 当前 dev_task spec + 绑定 requirement。

**深度说明**：

第 2 点是派工质量闸。如果当前 dev_task spec 或绑定 requirement 仍有 TBD、未闭环待用户拍板项，不能靠执行 agent 自己猜。应退回 task_breakdown、technical_design 或 requirement_analysis，而不是把歧义下放。

第 5 点的协商很重要。Codex 最知道什么 brief 会让执行时卡住；如果 Codex 说“文件范围不清楚”或“验收命令不可用”，你必须修 brief。

第 9 点不等于 Console 驱动业务。Console 可以提供按钮触发 dispatch，但指令语义和业务 brief 由 plugin 生成。

per-需求实施空间是 dispatch 前置生命周期动作，不是 Codex 执行细节。dispatch 侧只负责 `ensureRequirementWorktree({ projectRoot: canonicalRoot, requirementId, codeWorkspace })`，并在全部空间就绪后提交 ask；dispatch brief 应附运行态空间表，Codex 只消费已建好的 codeRoot/空间表，字段缺失、路径不存在或分支不匹配时应拒绝实施。

**拍板项扫描约定 v1**：

<!-- PAIBAN-SCAN-CONVENTION v1 START -->
放行前对「本节点在手文件」（各节点的"在手文件"定义见所在 manifest）执行【拍板项扫描约定 v1】：对在手文件运行 §钉死物件 2 的 rg pattern；命中处逐一人工裁决，归入三类之一才放行：① 已闭环拍板记录（含答案与理由）；② 非用户项（纯技术 / 中性词误命中）；③ 已显式移交下一节点的技术项。任一命中无法归类即阻塞，回对应节点在终端问到答案。机器辅助定位、人工裁决语义，不做语义硬判。
<!-- PAIBAN-SCAN-CONVENTION v1 END -->

扫描 pattern：

```text
待用户|待谁定|TBD|TODO|后续确认|待(确认|拍板|定|澄清|商榷|评估|回复|补充|明确|决)|未(定|决|确认|澄清|明确)|尚未(确定|明确|拍板|确认)|仍需(用户)?确认|需(用户)?(确认|拍板|澄清|回复|补充|明确|决策|授权)|等待用户(确认|拍板|裁决|仲裁|回复)
```

## ③ 什么时候算这个模式完成？

**必须同时满足**：

1. dispatch brief 已写清目标、范围、边界、验收和回执格式。
2. 所有命中的必问项已处理，且在手文件不存在未闭环待用户拍板项。
3. 至少 1 轮 Codex 协商完成，且已根据反馈修订 brief 或说明不采纳理由。
4. 4 段反思已记录。
5. 派工已提交、或明确因阻塞而 deferred。
6. EventJournal 有可追踪记录。
7. 用户能看到下一步：等待回执、修复阻塞或重新拆分。

**关于“命中”的定义**：

派工中最常命中的是 owner 决策、优先级、外部依赖、公共 API 改动和风险授权。命中后必须先问用户或引用已有授权。

**完成后去向**：

提交成功后进入 implementation 等待执行回执。若提交失败，停在 dispatch 并给出失败原因和恢复建议。

## ④ 不能干什么？（硬约束）

**绝对禁止**：

1. 用一句“请实现这个 spec”替代 dispatch brief。
2. 把未澄清的需求或未闭环待用户拍板项派给执行 agent。
3. 不说明禁止范围，让执行 agent 顺手重构。
4. 跳过 Codex 协商。
5. 未问用户就改变 owner、优先级或风险范围。
6. 要求执行 agent 修改 archive 历史或 Console 业务代码。
7. 派工后不留下可追踪记录。

**为什么这些是硬约束**：

派工质量决定执行质量。brief 不清楚会导致执行 agent 看似完成、实际偏题；没有审计记录会让用户无法判断 AI 团队到底做了什么。

## ⑤ 推荐的 sc 指令（本节点强烈推荐使用）

**第一阶段 —— 草拟 brief 前**

- `/sc:analyze --focus implementation-scope <子任务spec路径>`
  - 用途：检查范围、边界、文件影响和验收。
  - 为什么强烈推荐：派工最怕范围漏写或边界不清。

**第二阶段 —— brief 草拟后、找 Codex 前**

- `/sc:implement --plan-only <子任务spec路径>`
  - 用途：从执行路径角度检查步骤是否可落地。
  - 为什么强烈推荐：执行规划能暴露 brief 的不完整。

**第三阶段 —— 提交派工前**

- `/sc:business-panel`
  - 用途：检查派工是否仍服务用户目标，是否越界。
  - 为什么强烈推荐：避免为了技术完整性扩大任务。

**工程兜底**：

sc 不可用时，必须让 Codex 在协商中重点审查 brief 可执行性，并记录替代方式。

## ⑥ 好 / 中等 / 坏输出样例

**好的样子**：

```markdown
Dispatch brief for `pr2-node-manifest-rewrite`:

目标：新增 7 个 Markdown 节点 manifest，旧 YAML manifest 只加 deprecated 标记。
范围：`su-ccb-claude-plugin/references/kernel/nodes/`。
禁止：不动 `apps/`、不删旧 yaml、不改 Prisma。
验收：`wc -l nodes/*.node.md` 每个 >=200；SKILL.md 全部指向新的 Markdown manifest。
回执：列 changed files、验证命令、风险。

sc:implement 检查指出验证命令漏了 Console diff 检查。
Codex 协商指出 brief 需要明确“旧 yaml 不改名”。
我已修订。
```

**中等但不合格的样子**：

```markdown
请 Codex 按 spec 重写节点 manifest，注意不要动 Console。
```

不合格原因：缺文件范围、验收、禁止事项、回执格式，执行 agent 仍需猜。

**差的样子**：

```markdown
Codex 去做 SP-A11。
```

差的原因：没有派工契约。

**审计提示**：

检查派工时看 brief 是否能独立执行。若执行 agent 必须回头问“到底改哪些文件”，派工不合格。

**节点自检清单**：

1. 我是否读取了目标子任务 spec？
2. 我是否读取了 Requirement 上下文？
3. 我是否确认依赖已就绪？
4. 我是否写清目标？
5. 我是否写清范围？
6. 我是否写清禁止事项？
7. 我是否写清验证命令？
8. 我是否写清回执格式？
9. 我是否写清文件或目录边界？
10. 我是否运行或替代覆盖 implementation-scope 分析？
11. 我是否运行或替代覆盖 plan-only 实施规划？
12. Codex 是否从执行者视角审查 brief？
13. 我是否根据 Codex 反馈修订 brief？
14. 我是否写了 4 锚点反思？
15. 我是否扫描了 owner、优先级和风险授权？
16. 我是否避免派发未澄清需求？
17. 我是否避免让执行 agent 修改 archive？
18. 我是否避免让执行 agent修改 Console 业务代码，除非 spec 明确要求？
19. 我是否提交或记录了 dispatch id？
20. 我是否记录 dispatch_submitted 或失败原因？
21. 我是否向用户展示派工摘要？
22. 如果派工失败，我是否写清恢复建议？
23. 我是否没有把设计文档整段丢给执行者？
24. 执行 agent 能否不问问题直接开始？
25. 用户能否追踪这次派工的状态？

**常见打回原因**：

1. brief 没有明确文件范围。
2. brief 没有明确禁止事项。
3. brief 没有验证命令。
4. brief 没有回执格式。
5. brief 把未澄清需求丢给执行者。
6. 未说明派工目标 agent。
7. 未说明失败后如何恢复。
8. Codex 没有从执行者视角审查。
9. sc 不可用但没有替代说明。
10. 用户无法从记录追踪派工状态。

**恢复提示**：

1. brief 不清楚时，回到 task_breakdown 补子任务 spec。
2. 依赖未就绪时，停在 dispatch 并记录 blocker。
3. 目标 agent 忙碌时，记录 queued 状态，不重复派工。
4. 派工失败时，保留失败原因和可重试条件。
5. 用户改变优先级时，重新生成 brief。
6. 批量派工时，逐个子任务保留独立追踪记录。
7. 不要用一次失败推翻整个 Requirement。
8. 不要用重试掩盖 brief 缺陷。
9. 不要让 Console 状态替代 plugin 记录。
10. 恢复后重新做最小协商。
