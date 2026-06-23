---
node_id: archive
node_name: Archive
schema_version: ccb-node-manifest-md-v1
introduced_by: ADR-0030
status: active
---

# 节点：归档

## ① 什么时候进入这个模式？

**触发意图**（满足任一即进入）：

1. Review 已 pass，用户或 AI 需要收尾归档。
2. 用户说“归档”“结束这个任务”“把结果沉淀一下”；若对象是 requirement，则表示手动归档已 merged 的需求。
3. 子任务完成，需要更新 Requirement rollup。
4. 批量执行中某个子任务完成且审查通过。
5. 用户要求生成复盘、经验或下一步建议。

**AI 自判原则**：

归档不是把文件搬到 archive 目录那么简单。它是把“做了什么、为什么通过、还剩什么风险、后续怎么查”沉淀成可追溯历史。

**降智期提醒**：

不要在 Review 未 pass 时归档。不要把归档当成清理现场；归档是证据固化。

## ② 进入后大概怎么做？

**必须覆盖的核心要点**：

1. 确认 Review decision 为 pass，且没有未处理高风险。
2. 读取 spec、review 结论、执行回执和验证结果。
3. 使用推荐 sc 指令生成归档摘要、风险摘要和经验沉淀。
4. 找 Codex 协商归档是否完整，尤其检查是否遗漏风险或后续事项。
5. 写 4 段反思，明确归档内容是否被修订。
6. 处理命中的必问项：例如是否公开报告、是否触发后续任务、是否保留敏感信息。
7. 子任务归档只写 dev_task 终态和归档记录，不调用实施空间 merge/cleanup；per-需求实施空间必须保留到该需求全部非 cancelled dev_task 终态之后再由需求级收尾处理。
8. 写归档记录：完成内容、验证证据、风险、后续建议。
9. 更新 Requirement / DeliveryUnit 的完成投影文件。子任务归档时必须让
   `docs/03_开发计划/` 的 dev_task frontmatter 至少包含：
   `status: done`、`current_node: archive`、`node_substate: archived`、
   `review_status: passed`。
10. 若本次归档后可能已是 requirement 最后一个待归档子任务，AI 必须做一次
   requirement 收尾判断：扫描该 `requirement_id` 下全部 dev_task，排除 `status: cancelled`
   后，确认每个剩余 dev_task 均为 `status: done + current_node: archive +
   review_status: passed`，且无遗留必须处理事项、无未决 must_ask。满足条件时只执行
   `mergeRequirementWorktree()`，将该需求名下全部实施空间各自合并回各自运行态记录的源分支，并按项目声明同步空间间关联；整体 runtime state 进入 `merged` 并停止；不得在子任务
   archive 或 autonomous-batch 尾部执行 cleanup 或 `requirement.finalize`。requirement md
   必须保持非 delivered（通常为 `delivering`），实施空间与分支保留给用户预览。
   `mergeRequirementWorktree()` 返回 escalation 或 AI 判断不满足时，不得声明 delivered，
   并说明拒绝原因。
11. 需求级手动归档（用户明确归档 `requirement_id`）只接受 `merged` 或
   `archived + requirement 仍非 delivered` 的运行态。`merged` 时执行
   `cleanupRequirementWorktree()`，成功后重新读取 requirement md 当前 hash，再通过
   `applyCapabilityOutcome()` 声明 `capability_id=requirement.finalize` /
   `outcome_type=delivered`；finalize 调用必须携带 requirement md 的
   `expectedHash`/`base_hash` 和 `dev_task_requirement_terminal` evidence。若 cleanup 已成功但
   finalize CAS/guard 失败，重入时跳过 cleanup，走 finalize-only recovery。
12. 显式 reopen 只允许 `merged→ready`，调用 `reopenRequirementWorktree()`；它不改 git 内容，
   但必须以 requirement 级 all-or-nothing 校验全部实施空间与分支仍在且 clean。成功后 requirement 保持非 delivered，
   后续返工复用同一实施分支。
13. 归档写入前执行拍板项扫描约定 v1；在手文件 = 本次归档 dev_task + requirement 收尾文档。
14. 记录 EventJournal：archive_started、archive_completed、rollup_updated。
15. 自然停下或进入下一个已授权节点。

**深度说明**：

第 1 点是归档门。Review 未通过时归档会污染历史，让用户误以为任务已经完成。

第 4 点的协商用于防止“只报喜不报忧”。Codex 应检查归档摘要是否遗漏未验证项、剩余风险或用户决定。

第 6 点很关键。归档可能涉及公开、删除临时文件、生成后续任务或暴露敏感信息，这些可能命中用户必问清单。

需求级实施空间 merge/cleanup 必须使用各空间运行态记录的 `target_branch`，绝不 fallback 到 `main`，也不跨空间继承。`mergeRequirementWorktree` 或 `cleanupRequirementWorktree` 返回升级信号时，不得继续声明 delivered 或删除未校验现场；应把缺失分支、dirty preflight、divergence warning 或冲突信息纳入归档阻塞说明。子任务 archive 已经通过 review 时仍可先落 dev_task 终态，但不得因此提前 cleanup/finalize per-需求实施空间。

`merged` 是预览暂停态，不是交付终态。Console UI 文案或按钮不得作为唯一真相；真相以 requirement md、dev_task md 和 `docs/.ccb/worktrees/<requirementId>.json` 为准。

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

1. Review 已 pass，或用户明确授权带风险归档。
2. 归档记录已写入 dev_task 文档、EventJournal，必要时沉淀到 `docs/05_经验沉淀/` 或项目约定位置。
3. 所有命中的必问项已处理，且在手文件不存在未闭环待用户拍板项。
4. 至少 1 轮协商和 1 段 4 锚点反思已记录。
5. 完成内容、验证证据、风险和后续事项都可追溯。
6. Requirement / DeliveryUnit 状态投影已写入 plugin 真相源。
7. EventJournal 有 archive_completed。

**关于“命中”的定义**：

归档中命中必问项通常包括：公开报告、删除临时产物、生成后续任务、保留或移除敏感数据、改变“已交付”定义。命中就问，不命中就说明。

**完成后去向**：

如果还有同一 Requirement 下的下一个 DeliveryUnit 且用户授权批量推进，可进入 dispatch；否则自然停下并给用户归档摘要。

## ④ 不能干什么？（硬约束）

**绝对禁止**：

1. Review 未 pass 就普通归档。
2. 隐藏未验证项或剩余风险。
3. 删除用户文件或临时证据而未命中必问处理。
4. 跳过 Codex 协商。
5. 把归档写成“完成了”而没有证据。
6. 修改历史 archive 内容来美化结果。
7. 把敏感数据写入公开报告。

**为什么这些是硬约束**：

归档是团队记忆。它一旦失真，后续 replan、resume、audit 都会基于错误历史。归档必须诚实、完整、可追溯。

## ⑤ 推荐的 sc 指令（本节点强烈推荐使用）

**第一阶段 —— 收集证据后**

- `/sc:analyze --focus completion-evidence <spec或回执路径>`
  - 用途：检查完成证据和风险是否完整。
  - 为什么强烈推荐：避免归档只记录结果，不记录证据。

**第二阶段 —— 写归档摘要前**

- `/sc:business-panel`
  - 用途：从用户价值、剩余风险和后续机会角度复盘。
  - 为什么强烈推荐：归档应服务未来决策，不只是收尾。

**第三阶段 —— 生成后续建议时**

- `/sc:brainstorm --focus follow-up-opportunities`
  - 用途：发现可选后续任务或优化方向。
  - 为什么强烈推荐：帮助用户把经验转成下一步，但不能擅自开新任务。

**工程兜底**：

sc 不可用时，必须用人工清单覆盖完成证据、风险、后续事项，并让 Codex 协商重点审查遗漏。

## ⑥ 好 / 中等 / 坏输出样例

**好的样子**：

```markdown
Archive summary:

完成内容：
- 新增 main-terminal spawn endpoint
- Banner 黄/绿态按钮
- 前后端测试

验证证据：
- 后端 route spec 10/10
- 前端 banner spec 8/8
- server 全量 vitest 652 passed

未覆盖：
- 未做真实实体终端手工 E2E

Codex 协商指出未覆盖项必须保留在归档摘要，我采纳。

反思：
- 我同意：归档不能隐藏 E2E 未验证。
- 我不同意：不需要为既有 Prisma 噪声阻断归档。
- 我的盲点：用户未来查问题时最需要验证证据。
- 接下来：写 archive report 并更新 rollup。
```

**中等但不合格的样子**：

```markdown
任务完成，测试通过，已归档。
```

不合格原因：没有证据、没有未覆盖风险、没有协商。

**差的样子**：

```markdown
Done.
```

差的原因：没有任何可审计价值。

**审计提示**：

归档必须能回答四个问题：完成了什么，证据是什么，什么没验证，未来的人如何继续。

**节点自检清单**：

1. 我是否确认 Review 已 pass？
2. 若 Review 未 pass，我是否有用户明确授权带风险归档？
3. 我是否读取了 spec？
4. 我是否读取了 review 结论？
5. 我是否读取了执行回执和验证证据？
6. 我是否运行或替代覆盖 completion-evidence 分析？
7. 我是否运行或替代覆盖业务复盘？
8. 我是否找 Codex 协商归档完整性？
9. 我是否写了 4 锚点反思？
10. 我是否写清完成内容？
11. 我是否写清验证证据？
12. 我是否写清未覆盖项？
13. 我是否写清剩余风险？
14. 我是否写清后续建议？
15. 我是否避免删除用户文件或证据？
16. 我是否避免把敏感数据写入公开报告？
17. 我是否扫描了公开、删除、后续任务等必问项？
18. 我是否按拍板项扫描约定 v1 扫描本次归档在手文件，并逐一裁决命中？
19. 我是否更新了 Requirement 或 DeliveryUnit 投影文件？
20. 若是 scope 内最后一个子任务，我是否用 AI 判断式 `requirement.finalize`
    outcome 完成或明确拒绝 requirement delivered 声明？
21. 我是否记录 archive_started？
22. 我是否记录 archive_completed？
23. 我是否没有修改历史 archive 来美化结果？
24. 我是否说明了是否继续下一个 DeliveryUnit？
25. 用户未来能否通过归档理解任务背景？
26. 新 agent 接手时能否从归档恢复上下文？
27. 归档是否诚实呈现了未验证风险？

**常见打回原因**：

1. Review 未 pass 却普通归档。
2. 只有“完成了”，没有证据。
3. 没有记录未覆盖项。
4. 没有记录剩余风险。
5. 删除或覆盖了用户证据。
6. 归档报告包含敏感信息。
7. 没有 Requirement rollup。
8. Codex 没有检查归档完整性。
9. sc 不可用但没有替代说明。
10. 后续 agent 无法从归档恢复上下文。
