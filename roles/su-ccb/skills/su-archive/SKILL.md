---
name: su-archive
description: 在 review 通过后固化完成证据、风险和后续建议。
metadata:
  short-description: CCB 归档入口
---

# /ccb:su-archive

## 1. 指令意图说明

`/ccb:su-archive` 用于把已通过 review 的任务沉淀成可追溯历史。归档不是“结束任务”四个字，而是写清完成内容、证据、未覆盖项、风险和后续建议。

## 2. 节点集声明

主要进入：

| 节点 | Manifest |
|---|---|
| 归档 | `references/kernel/nodes/archive.node.md` |

如果 review 未通过，必须回到 `references/kernel/nodes/review.node.md`，不得普通归档。

## 3. 触发约定

```text
/ccb:su-archive task_id=<subtaskId>
/ccb:su-archive requirement_id=<requirementId>
/ccb:su-archive --reopen requirement_id=<requirementId>
/ccb:su-archive 当前已通过 review 的任务
```

可带 `risk_accepted=true`，但只有用户明确授权带风险归档时才可使用。

`task_id` 是子任务归档入口；`requirement_id` 是需求级手动归档入口，用于把已
`merged` 的 per-需求 worktree 清理并把 requirement finalize 为 `delivered`。
`--reopen` 是显式返工入口，用于把 `merged` worktree 解冻回 `ready`，复用同一实施分支继续改。

## 4. Plugin 独立运行约定

归档记录直接写入 plugin 域文件：

1. `docs/05_经验沉淀/`（需要沉淀经验时）
2. `docs/03_开发计划/*开发任务.md`
3. `docs/.ccb/events/journal.jsonl`

子任务归档不得调用 worktree merge/cleanup。归档子任务时，只写该 dev_task 终态和归档记录：

```js
await writeTaskState({
  projectRoot,
  taskId,
  title,
  patch: {
    status: "done",
    current_node: "archive",
    node_substate: "archived",
    review_status: "passed"
  },
  updatedBy: "ai_session"
});
```

归档必须以 `docs/03_开发计划/` 的 dev_task 文档为任务真相；`status/current_node/node_substate/review_status` 只能通过受治理写入更新。

归档子任务后，如果该子任务可能是 requirement 最后一个待归档项，只能做 requirement-wide
终态判断并调用 `mergeRequirementWorktree()` 进入 `merged` 预览暂停；不得 cleanup 或声明
`delivered`。需求交付状态必须等用户执行需求级手动归档。

需求级手动归档入口（`/ccb:su-archive requirement_id=<id>`）必须按顺序执行：

1. 读取 requirement md 和 `docs/.ccb/worktrees/<id>.json`，确认 requirement 未
   `cancelled/deferred` 且 worktree runtime aggregate 为 `merged`；若 runtime aggregate 已是 `archived` 且
   requirement 仍未 `delivered`，进入 finalize-only recovery。
2. runtime aggregate 为 `merged` 时调用 `cleanupRequirementWorktree({ projectRoot, requirementId,
   codeWorkspace })`。cleanup 按 implementation spaces 声明序逐空间执行；若返回
   `status: "escalated"`，保留已成功 archived 的空间事实并停止，不得 finalize。仅
   `aggregate=merged`、`aggregate=escalated && last_error.op=="cleanup"` 或已 `archived`
   可进入 cleanup。
3. cleanup 成功后重新读取 requirement md 当前 hash，再通过 `applyCapabilityOutcome()` 声明
   delivered；必须使用 `dev_task_requirement_terminal` evidence 和
   `requirement_finalize_expected_hash` guard。
4. 若 cleanup 已成功但 finalize 因 CAS/hash 等失败，后续重入必须识别
   `aggregate=archived + requirement 仍非 delivered`，跳过 cleanup，执行 finalize-only recovery。

示例：

```js
import { readFile } from "node:fs/promises";
import { cleanupRequirementWorktree, reopenRequirementWorktree } from "../../lib/worktree/index.mjs";
import { applyCapabilityOutcome } from "../../lib/capability-outcome/index.mjs";
import { hashContent } from "../../lib/runtime/index.mjs";

const cleanup = await cleanupRequirementWorktree({
  projectRoot,
  requirementId,
  codeWorkspace
});
if (cleanup.status === "escalated") return cleanup;

const requirementContent = await readFile(requirementMarkdownPath, "utf8");
const requirementMarkdownHash = hashContent(requirementContent);
await applyCapabilityOutcome({
  projectRoot,
  capabilityId: "requirement.finalize",
  outcomeType: "delivered",
  subjectRef: {
    subject_type: "requirement",
    subject_id: requirementId,
    canonical_path: requirementMarkdownPath,
    base_hash: requirementMarkdownHash
  },
  expectedHash: requirementMarkdownHash,
  evidence: [{
    kind: "C",
    ref: `dev-task-requirement:${requirementId}`,
    check_id: "dev_task_requirement_terminal",
    params: { requirement_id: requirementId }
  }]
});
```

如果全需求 dev_task 未终态、review 未通过、hash 已变、需求已 cancelled/deferred 或 AI 判断仍有
必须处理事项，不得声明 delivered；输出拒绝原因。

reopen 入口（`/ccb:su-archive --reopen requirement_id=<id>`）只处理 `merged→ready`：

```js
await reopenRequirementWorktree({
  projectRoot,
  requirementId,
  codeWorkspace
});
```

`reopenRequirementWorktree` 不改 git 内容；它仅允许 `aggregate=merged`，并校验全部
implementation spaces 的 worktree+分支仍存在且 clean（单空间即 worktree+分支仍存在且 worktree clean）。任一空间失败时 all-or-nothing
返回 `status: "escalated"`、保留 runtime 不写并报告原因；成功后全部空间回到 `ready`，
associations 重置为 pending，requirement 保持非 delivered，后续返工继续复用实施分支。

不得调用 Console 业务写入接口改业务状态。Console 只负责展示归档投影。

归档 / merge / finalize / reopen 写完 canonical 后，**best-effort 主动触发一次 Console 投影刷新**（本地 Console 在跑时 `POST /api/projects/<projectId>/scan`），并校验投影（子任务 `current_node/status`、需求 `status`、worktree runtime status）与 canonical 一致，不要只依赖 watcher 异步跟上（WSL2 会漏文件事件）；Console 不可达或投影不一致时，告知用户需手动 scan。Console UI 当前不是手动归档能力的唯一真相源。

## 5. 强协商与 sc 要求

归档前必须：

1. 确认 review pass 或用户授权带风险归档。
2. 使用 archive 节点推荐 sc 指令，或说明替代方式。
3. 找 Codex 检查归档完整性。
4. 写 4 锚点反思。
5. 明确是否有敏感信息、后续任务或公开风险。

## 6. 用户可见输出

输出归档路径、完成摘要、验证证据、未覆盖风险、后续建议和是否继续下一个 DeliveryUnit。
