---
name: su-revise-breakdown
description: 根据用户反馈重写 Requirement breakdown draft。
metadata:
  short-description: 拆分草案修订入口
---

# /ccb:su-revise-breakdown

## 1. 指令意图说明

`/ccb:su-revise-breakdown` 用于用户在拆分审查后要求调整任务切片时，重新生成 breakdown draft。它不是简单编辑 JSON，而是回到任务拆分判断。

## 2. 节点集声明

主要进入：

| 节点 | Manifest |
|---|---|
| 任务拆分 | `references/kernel/nodes/task_breakdown.node.md` |

必要时回退：

| 情况 | 回退节点 |
|---|---|
| 用户反馈改变需求范围 | `references/kernel/nodes/requirement_analysis.node.md` |
| 用户反馈改变技术方案 | `references/kernel/nodes/technical_design.node.md` |

## 3. 触发约定

```text
/ccb:su-revise-breakdown --payload {"subject":"requirement","requirement_id":"<id>","action":"breakdown_draft_reject","expected_hash":"<hash>","feedback":{"summary":"合并前两个子任务","items":["补齐验收标准"]}}
```

### breakdown-draft revise/reject 契约

当 `payload.action=breakdown_draft_reject` 时，直接读取 JSON 内的 `feedback` object 作为用户反馈，再调用状态迁移记录拒绝；随后按 task_breakdown 节点重写新 draft：

```js
import {
  readBreakdownDraft,
  transitionBreakdownDraftStatus,
  updateBreakdownDraft
} from "../../lib/breakdown-draft/index.mjs";

await transitionBreakdownDraftStatus({
  projectRoot,
  requirementId,
  expectedHash,
  fromStatus: "reviewing",
  toStatus: "draft",
  feedback: payload.feedback
});
```

参数：`payload.requirement_id`、`payload.expected_hash`、`payload.feedback.summary` 必填。重写 draft 时先 `readBreakdownDraft()` 获取最新 hash，再用 `updateBreakdownDraft({ projectRoot, requirementId, patch, expectedHash })` 写回。`ConflictError` 表示用户反馈基于旧 draft，必须重新审查；`ValidationError` 表示反馈或 draft 不合法；`LockTimeoutError` 表示另一个 anchor 正在写。严禁用 `fs.writeFile` 直接改 `docs/.ccb/drafts/breakdown/*.json`。

## 4. Plugin 独立运行约定

定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。Requirement 与技术设计等业务文档落点必须经 docs-structure resolver / 目录契约定位；`.ccb/drafts` 仅保存拆分草稿机制件。

读取当前 draft、用户反馈和相关 Requirement / technical_design 文档，生成新版 `docs/.ccb/drafts/breakdown/<requirementId>.json`。保留 review history 和旧 revision，不调用 Console 业务写入接口。

## 5. 强协商与 sc 要求

必须按 task_breakdown 节点要求使用 sc 或替代方式，并找 Codex 协商新切片是否可执行。若用户反馈实际改变需求或技术方案，不得只改 draft，要回退对应节点。

## 6. 用户可见输出

输出变更摘要、新旧 draft 差异、已在终端问到答案并闭环记录的用户拍板项和下一步审查入口；若仍有命中项未获答复，先停在当前终端等待答案，不落 draft。
