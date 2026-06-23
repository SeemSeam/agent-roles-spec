---
node_id: review
node_name: Review
schema_version: ccb-node-manifest-md-v1
introduced_by: ADR-0030
status: active
---

# 节点：审查

## ① 什么时候进入这个模式？

**触发意图**（满足任一即进入）：

1. 执行 agent 提交回执，等待 Claude 审查。
2. 用户说“review 一下”“看 Codex 做得对不对”。
3. 实施完成但需要确认是否满足 spec、边界和验证要求。
4. 自动批量执行中某个子任务返回结果。
5. 用户要求决定通过、返工、升级或归档。

**AI 自判原则**：

Review 的核心不是礼貌性验收，而是替用户判断“这份实现是否真的满足已确认目标”。Review 要优先找问题、风险、缺失验证和范围扩散。

**降智期提醒**：

不要被“测试通过”四个字说服。你要看测试是否覆盖验收，diff 是否越界，回执是否隐藏未做项。

## ② 进入后大概怎么做？

**必须覆盖的核心要点**：

1. 读取 spec、dispatch brief、执行回执和实际 diff。
2. 对照验收逐项检查，区分已满足、未满足、无法判断。
3. 使用推荐 sc 指令增强代码审查、风险和测试覆盖判断。
4. 找 Codex 协商审查结论，让 Codex 对自己的或另一个 agent 的结果接受质疑。
5. 写 4 段反思，明确你是否被 Codex 改变判断。
6. 检查必问项：是否出现用户未授权的依赖、schema、API、成本或业务变更。
7. 做 review decision：pass、request changes、replan、escalate。
8. 若 request changes，写清返工目标、边界和验证要求。
9. 若 pass，记录通过理由和剩余风险。
10. 把结论写入 EventJournal。
11. 做 review decision 前执行拍板项扫描约定 v1；在手文件 = 本次审查产物（requirement / technical_design / dev_task）+ diff。

**深度说明**：

第 2 点要求你逐项对照验收，而不是读完回执凭印象判断。Review 的价值在于发现“看似完成但没满足验收”的情况。

第 4 点不是让 Codex 自证清白。你要明确要求 Codex 回答：哪些验收有证据，哪些风险可能被低估，哪些文件改动可能越界。

第 7 点的 replan 是重要出口。如果实现暴露出需求或设计错误，不要硬让执行 agent 修补，应回到 technical_design 或 task_breakdown。

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

1. 每条验收都有 pass/fail/unknown 判断和理由。
2. 所有命中的必问项已处理，且在手文件不存在未闭环待用户拍板项。
3. 至少 1 轮协商和 1 段 4 锚点反思已记录。
4. 已明确 review decision：pass、request changes、replan 或 escalate。
5. 若通过，剩余风险已写清。
6. 若返工，返工 brief 可直接派发。
7. EventJournal 记录完整。

**关于“命中”的定义**：

Review 中发现任何未授权依赖、schema 改动、公共 API 改动、外部服务调用、成本或业务规则变化，都命中必问项。不能因为实现已经发生就默认接受。

**完成后去向**：

pass 后进入 archive；request changes 后回到 implementation 或 dispatch；replan 后回到 technical_design / task_breakdown / requirement_analysis；escalate 后等待用户裁决。

## ④ 不能干什么？（硬约束）

**绝对禁止**：

1. 只看执行回执，不看 diff 或证据。
2. 因为测试通过就直接 pass。
3. 未处理未授权变更就归档。
4. 跳过 Codex 协商。
5. 把 review 变成重新实现。
6. 对 unknown 验收项用“应该可以”糊弄。
7. pass 后仍留下未解释的高风险。

**为什么这些是硬约束**：

Review 是用户信任 AI 团队的最后质量门。这里的宽松会让错误进入归档，之后再修的成本更高。

## ⑤ 推荐的 sc 指令（本节点强烈推荐使用）

**第一阶段 —— 读回执后**

- `/sc:analyze --focus code-review <变更路径>`
  - 用途：从缺陷、风险、边界和可维护性角度审查。
  - 为什么强烈推荐：人工式 review 能发现测试没有覆盖的问题。

**第二阶段 —— 验证证据时**

- `/sc:analyze --focus test-coverage <测试路径或变更路径>`
  - 用途：评估验证是否覆盖 spec 验收。
  - 为什么强烈推荐：测试通过不等于验收满足。

**第三阶段 —— 做通过/返工决定前**

- `/sc:business-panel`
  - 用途：检查实现是否仍符合用户业务目标和风险授权。
  - 为什么强烈推荐：避免技术 pass 但业务 fail。

**工程兜底**：

sc 不可用时，必须增加人工式检查清单，并让 Codex 协商重点覆盖代码风险和测试覆盖。

## ⑥ 好 / 中等 / 坏输出样例

**好的样子**：

```markdown
Review decision: request changes

验收检查：
1. 新 endpoint 返回 409：pass，有测试 `project-onboarding.routes.spec.ts`。
2. 前端红态隐藏按钮：pass，有组件测试。
3. 真实打开实体终端：unknown，未手工 E2E。

sc:analyze 指出错误 toast 没展示 attempted，我复核后发现已展示前两条。
Codex 协商指出 server 全量测试有既有 Prisma 噪声，不应当作失败。

反思：
- 我同意 Codex 对既有噪声的判断。
- 我不同意直接 pass，因为真实 E2E 未覆盖。
- 我的盲点是验收 5 需要手工环境。
- 接下来请求补手工验证或在风险里明确未覆盖。
```

**中等但不合格的样子**：

```markdown
测试通过，整体看起来没问题，可以归档。
```

不合格原因：没有逐项验收，没有 unknown 风险，没有协商和反思。

**差的样子**：

```markdown
Codex 做完了，pass。
```

差的原因：完全没有 review。

**审计提示**：

Review 必须能回答：哪些证据支持 pass，哪些仍 unknown，是否有未授权变更，为什么现在可以或不可以归档。

**节点自检清单**：

1. 我是否读取了 spec？
2. 我是否读取了 dispatch brief？
3. 我是否读取了执行回执？
4. 我是否查看了实际 diff？
5. 我是否逐项检查验收？
6. 我是否给每项验收标 pass/fail/unknown？
7. 我是否运行或替代覆盖 code-review 分析？
8. 我是否运行或替代覆盖 test-coverage 分析？
9. 我是否找 Codex 协商审查结论？
10. Codex 是否指出了风险或确认无风险理由？
11. 我是否写了 4 锚点反思？
12. 我是否检查未授权依赖？
13. 我是否检查未授权 schema/API 改动？
14. 我是否检查未授权外部服务、成本或合规风险？
15. 我是否按拍板项扫描约定 v1 扫描本次审查在手文件，并逐一裁决命中？
16. 我是否区分了测试通过和验收满足？
17. 我是否说明了 unknown 项？
18. 我是否选择了 pass/request changes/replan/escalate？
19. 如果 request changes，我是否写了可派发返工 brief？
20. 如果 pass，我是否写了通过理由？
21. 如果 replan，我是否说明回到哪个节点？
22. 我是否记录了剩余风险？
23. 我是否没有在 review 中擅自重新实现？
24. 我是否没有把高风险隐藏进归档？
25. 我是否记录了 EventJournal？
26. 用户能否理解为什么通过或为什么打回？
27. 若审查对象含 requirement/technical_design 文档产物：目标对齐首屏能让用户秒懂吗？
28. 若含文档产物：模拟示例存在，或豁免理由（「无需示例，因为…」）站得住吗？
29. 若含文档产物：黑话首现都带白话解释吗（document-expression-spec R4）？

**常见打回原因**：

1. 只读回执，没有看 diff。
2. 只说测试通过，没有逐项验收。
3. unknown 项被当作 pass。
4. 未授权改动被忽略。
5. 高风险被写成低风险。
6. request changes 没有返工 brief。
7. replan 没有说明回到哪个节点。
8. Codex 没有参与审查结论。
9. sc 不可用但没有替代说明。
10. 用户无法理解 review decision。

**恢复提示**：

1. 证据不足时，标 unknown，不要 pass。
2. 验证无法运行时，要求补证据或记录风险。
3. 发现需求错误时，回 requirement_analysis。
4. 发现设计错误时，回 technical_design。
5. 发现切片错误时，回 task_breakdown。
6. 发现实现缺陷时，request changes。
7. 发现用户权利问题时，升级用户。
8. 多轮协商无新增信息时，升级用户。
9. 不要为了归档压力降低 review 标准。
10. 恢复 review 时重新读取最新 diff。
