---
name: su-approve
description: 记录用户对某个审查门、拆分草案或风险事项的明确批准。
metadata:
  short-description: 用户批准记录
---

# /ccb:su-approve

## 1. 指令意图说明

`/ccb:su-approve` 用于把用户的明确批准写入 docs / `.ccb` 协调件。它不是 AI 自己放行的按钮，而是记录用户已拍板某个必问项、审查门或风险接受。

## 2. 节点集声明

本指令可服务多个节点：

| 使用场景 | 关联节点 |
|---|---|
| 需求澄清批准 | `references/kernel/nodes/requirement_analysis.node.md` |
| 技术方案批准 | `references/kernel/nodes/technical_design.node.md` |
| 拆分草案批准 | `references/kernel/nodes/task_breakdown.node.md` |
| 带风险归档批准 | `references/kernel/nodes/archive.node.md` |

## 3. 触发约定

```text
/ccb:su-approve --payload {"subject":"requirement","requirement_id":"<id>","action":"breakdown_draft_approve","expected_hash":"<hash>","reviewer_note":"用户批准当前拆分草案"}
/ccb:su-approve --payload {"subject":"requirement","requirement_id":"<id>","item":"<decision-key>"}
/ccb:su-approve --payload {"subject":"subtask","task_id":"<id>","risk":"<risk-id>"}
```

如果用户只是模糊说“可以”，Claude 必须说明批准的是哪一项，并让用户确认，避免把泛泛同意扩大成全局授权。

### breakdown-draft approve 契约

当 `payload.action=breakdown_draft_approve` 时，必须调用 lib，不得直接写 draft 文件：

```js
import { transitionBreakdownDraftStatus } from "../../lib/breakdown-draft/index.mjs";

await transitionBreakdownDraftStatus({
  projectRoot,
  requirementId,
  expectedHash,
  fromStatus: "reviewing",
  toStatus: "approved",
  reviewerNote,
  approvedBy: "user"
});
```

参数：`requirement_id` 与 `expected_hash` 必填，`reviewer_note` 可选。`expected_hash` 缺失或过期时停止，不得降级批准。`ConflictError` 告知用户“草案已变化，请重新审查”；`ValidationError` 告知当前状态不能批准；`LockTimeoutError` 告知另一个 anchor 正在写。严禁用 `fs.writeFile` 直接改 `docs/.ccb/drafts/breakdown/*.json`。

## 4. Plugin 独立运行约定

定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。业务文档落点必须经 docs-structure resolver / 目录契约定位；`.ccb` 只承载 state、events、draft、report、lock、index cache 等机器协调件。

批准记录写入：

1. 对应业务文档或 state 文件的 decision section。
2. `docs/.ccb/events/journal.jsonl`。
3. 必要时更新 breakdown draft review history。

不得调用 Console 业务写入接口写批准状态。Console 只展示 approval projection。

## 5. 强协商与 sc 要求

如果批准事项影响业务规则、隐私、成本、合规或不可逆工程动作，Claude 应在记录前复述用户决定和影响。复杂事项建议先与 Codex 协商确认“这个批准是否足够明确”。

## 6. 用户可见输出

输出批准项、影响范围、写入位置、是否解除某个节点阻塞，以及下一步自动继续还是等待用户。
