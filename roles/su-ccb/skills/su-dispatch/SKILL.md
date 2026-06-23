---
name: su-dispatch
description: 把已确认的子任务派给执行 agent 的指令入口。
metadata:
  short-description: CCB 派工入口
---

# /ccb:su-dispatch

## 1. 指令意图说明

`/ccb:su-dispatch` 用于把一个已明确的 DeliveryUnit / 子任务派给 Codex、Claude 或其他执行 agent。它解决的业务问题是：执行者要清楚知道做什么、不做什么、怎么验证、如何回执。

## 2. 节点集声明

主要进入：

| 节点 | Manifest |
|---|---|
| 派工 | `references/kernel/nodes/dispatch.node.md` |

必要时可回退：

| 场景 | 回退节点 |
|---|---|
| 子任务边界不清 | `references/kernel/nodes/task_breakdown.node.md` |
| 技术方案缺失 | `references/kernel/nodes/technical_design.node.md` |
| 用户原意不清 | `references/kernel/nodes/requirement_analysis.node.md` |

## 3. 触发约定

```text
/ccb:su-dispatch --payload {"subject":"subtask","task_id":"<subtaskId>","owner":"ccb_codex"}
/ccb:su-dispatch --payload {"subject":"subtask","task_id":"<subtaskId>","target_agent":"slot1_codex","cross_group_reason":"指定跨组复核"}
/ccb:su-dispatch 按当前子任务派给 codex
```

Console UI 可以投递同等 `--payload` JSON 命令到 anchor。payload 只用于定位主体和执行者，不授权跳过 dispatch manifest。

### ask target 路由契约

派工提交前必须先解析实际 `ccb ask` 目标：

```js
import {
  buildCcbAskInvocation,
  resolveAskRouting
} from "../../lib/ask-routing/index.mjs";
```

规则：

1. `target_agent` 或用户自然语言里明确的 agent 名才算显式 target；`owner=ccb_codex` / `owner=claude` 只是 dev_task 执行角色，不得直接当 ask target。
2. 未显式 target 时调用 `resolveAskRouting({ projectRoot })`，用当前 actor 所在 window 的唯一互补 provider 成员作为默认目标。
3. helper 返回 `status="needs_explicit_target"` 时，派工必须 deferred 并要求用户或上游流程给出实际 agent，不能 fallback 到 `main_codex` 或其它项目级默认。
4. 显式 target 保持不变；若 helper 返回 `routing.warnings` 或 `routing.crossGroup.requiresReason=true`，派工 brief / 用户输出必须写明跨组 warning 或 `cross_group_reason`，但不硬拦合法跨组。
5. 生成命令时使用 `buildCcbAskInvocation({ target: routing.target, taskId })`；消息正文仍按 dispatch brief 合同单独构造，不拼进 target。

### breakdown-draft read 契约

如果派工 brief 需要引用原 Requirement 的拆分草案，只能通过 lib 读取：

```js
import { readBreakdownDraft } from "../../lib/breakdown-draft/index.mjs";

const { draft, hash } = await readBreakdownDraft({ projectRoot, requirementId });
```

dispatch 只读取 draft 来确认 include、依赖、owner 和验收，不在本指令里修改 draft。`ValidationError` 说明草案不可作为派工依据；`LockTimeoutError` 说明另一个 anchor 正在写，需稍后重试。严禁用 `fs.writeFile` 直接改 `docs/.ccb/drafts/breakdown/*.json`。

### requirement worktree ensure 契约

对带 `code_workspace` 的 dev_task，派工在 `ccb ask` 前必须先调用 plugin worktree helper：

```js
import { ensureRequirementWorktree } from "../../lib/worktree/index.mjs";

await ensureRequirementWorktree({
  projectRoot,
  requirementId,
  codeWorkspace: devTask.code_workspace
});
```

`ensureRequirementWorktree` 是幂等前置动作：首次按项目拓扑展开该需求名下全部实施空间，零拓扑声明时退化为单 root 空间 `../SU-CCB-req-<reqId>`；重复派工 no-op。helper 会把每个空间的 `target_branch` / `base_sha` 写入 canonicalRoot 的 `docs/.ccb/worktrees/<reqId>.json`，只有 `aggregate_status=ready` 才能提交 `ccb ask`；不要让 Codex 自建 worktree。

派工 brief 必须从 `docs/.ccb/worktrees/<reqId>.json` 附运行态空间表，至少包含 `space_id`、`repo`、`path`、`branch`、`target_branch`。单空间时也按同一表述给出 root 空间，避免执行者依赖旧的隐含单 worktree 规则。

## 4. Plugin 独立运行约定

本 skill 直接读取：

启动/定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。业务文档落点必须经 docs-structure resolver / 目录契约定位。

1. dev_task 文档（经 resolver 定位；当前契约落点为 `docs/03_开发计划/`）
2. `docs/.ccb/drafts/breakdown/*.json`
3. `docs/.ccb/events/journal.jsonl`

派工 brief 和任务流转写入对应 dev_task frontmatter / 正文中的受治理区域，并通过 ccbd/ask 通信路径交给目标 agent；审计事件写 EventJournal。不得调用 Console 业务写入接口写业务状态。

## 5. 强协商与 sc 要求

派工前必须：

1. 使用 dispatch 节点推荐 sc 指令，或说明替代方式。
2. 让 Codex 从执行者视角审查 brief。
3. 写 4 锚点反思。
4. 记录派工结果和可追踪 id。

## 6. 用户可见输出

输出 brief 摘要、目标 agent、禁止范围、验证要求、回执要求、派工状态和下一步等待项。
