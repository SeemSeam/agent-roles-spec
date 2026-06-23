---
name: su-cancel
description: 取消 Requirement 或子任务的大状态指令入口。
metadata:
  short-description: CCB 取消入口
---

# /ccb:su-cancel

## 1. 指令意图说明

`/ccb:su-cancel` 记录用户取消 Requirement 或子任务的决定。取消是大状态指令，业务状态写入只能通过 `lib/requirement-cancel` 间接调用 `applyCapabilityOutcome` 完成。

## 2. 触发约定

```text
/ccb:su-cancel --payload {"subject":"requirement","requirement_id":"<id>","reason":"用户放弃该需求"}
/ccb:su-cancel --payload {"subject":"subtask","task_id":"<id>","reason":"用户放弃该子任务"}
```

Console 详情页确认弹窗即用户授权 `must_ask_9`；`reason` 允许为空，但必须原样透传给 lib 作为审计字段。

## 3. Lib 调用契约

Requirement 取消必须调用：

```js
import { cancelRequirement } from "../../lib/requirement-cancel/index.mjs";

const result = await cancelRequirement({
  projectRoot,
  requirementId: payload.requirement_id,
  reason: payload.reason,
  sourceActor: "ccb_claude",
  dispatchRef
});
```

子任务取消必须调用：

```js
import { cancelSubtask } from "../../lib/requirement-cancel/index.mjs";

const result = await cancelSubtask({
  projectRoot,
  taskId: payload.task_id,
  reason: payload.reason,
  sourceActor: "ccb_claude",
  dispatchRef
});
```

`cancelRequirement` 的顺序固定为：resolve+terminal precheck → `user_cancel_authorized` → `requirement.cancel` 墓碑 → 非终态 dev_task 逐个 `subtask.cancel` → 删除 breakdown draft → state-aware worktree cleanup → `requirement_cancel_cascade_completed`。已 `cancelled` Requirement 进入 resumeMode，只跳过墓碑并继续清理后续步骤。

严禁在 skill 内用 `fs.writeFile`、`writeTaskState`、Console API 或手写 frontmatter 直接把 Requirement/dev_task 改成 `cancelled`。严禁先 discard worktree 再写墓碑。

## 4. 错误处置

| code / 场景 | 处置 |
|---|---|
| `GUARD_FAILED` | 报告拒绝原因；delivered Requirement 和 done 子任务不得覆盖。 |
| `MUST_ASK_APPROVAL_MISSING` | 停止，不补造授权；要求从 Console 确认弹窗重新派发。 |
| `CAS_CONFLICT` | Requirement 级停止并报告需重派；子任务级由 lib 重读重判一次，仍失败才报告。 |
| `LOCK_TIMEOUT` / retry exhausted | 报告稍后重试；不得手工绕过锁。 |
| worktree `escalated` | 报告保留现场和 lib 返回 reason；不得调用旧 Console worktree API 兜底。 |

任一终局失败时，lib 会 best-effort 写 `capability_outcome_rejected`，供 Console 失败反馈读取。

## 5. Plugin 独立运行约定

定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。Requirement / dev_task 落点必须经 docs-structure resolver / 目录契约定位；`.ccb` 只承载 events、draft、lock、index cache、worktree runtime state 等机器协调件。

lib 返回后可 best-effort 调用 Console `POST /scan` 加速投影收敛；Console 缺席、端口不可达或扫描失败都只记录在回执中，不改变取消结果。

## 6. 用户可见输出

输出 `result.ok`、取消对象、是否 resumeMode、已取消子任务、跳过项、失败 code/issues、Requirement/dev_task/journal/worktree 关键路径，以及是否已触发 best-effort scan。
