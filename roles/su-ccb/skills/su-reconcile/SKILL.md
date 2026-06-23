---
name: su-reconcile
description: AI-native 自检 docs 人读真相源、.ccb 协调件与 Console 投影漂移，并按审批结果执行修复。
metadata:
  short-description: AI 自检与状态修复
---

# /ccb:su-reconcile

## 1. 指令意图说明

`/ccb:su-reconcile` 是维护 skill，不是第 8 节点。它用于用户主动触发 AI 自检，找出 docs 人读真相源、EventJournal / index 等 `.ccb` 协调件与 Console 投影之间的漂移，并生成可审批的修复报告。

## 2. 触发约定

检测：

```text
/ccb:su-reconcile --payload {"scope":"project","mode":"detect"}
```

应用：

```text
/ccb:su-reconcile --payload {"scope":"project","mode":"apply","report_path":"docs/.ccb/drafts/reconcile/2026-05/reconcile-<ts>.md","approved_actions":["rec-..."]}
```

`scope` 可为 `project` / `requirement` / `task`；v1.0 主路径是 project。`apply` 必须引用已生成的报告，并只执行用户审批的 approve 级 action；auto 级 action 可自动执行，forbid 级永不执行。

## 3. lib 调用契约

必须调用 plugin lib，不得自己 `fs.writeFile` / `fs.rm` 绕过 runtime：

```js
import { runReconcileDetect, applyApprovedActions } from "../../lib/reconcile/index.mjs";

await runReconcileDetect({ projectRoot, scope, projectionSnapshot });

await applyApprovedActions({
  projectRoot,
  reportPath,
  approvedActionIds
});
```

`applyApprovedActions` 对 task 类修复只写 `docs/03_开发计划/` 的 dev_task frontmatter，不直写 Console DB。所有写入必须通过 `safeWriteFile` CAS，并写 EventJournal `state_reconciled`。

## 4. Plugin 独立运行约定

定位上下文时先读 `docs/00_项目总览.md`、`docs/00_文档地图.md` 和 `docs/.ccb/docs-structure-contract.yaml`。业务文档落点必须经 docs-structure resolver / 目录契约定位；`.ccb` 只承载 events、draft、lock、index cache、schema/config 等机器协调件。

CLI-only 可完成 detect、报告生成和 canonical docs 文件写入。Console 只是触发器、报告展示和 DB 投影刷新层；不得依赖 Console 业务写入 API。

## 5. 强协商与必问边界

发现 canonical 文件冲突、依赖图冲突、删除/移动文件、状态裁决不确定时，必须先与 Codex 深度协商并升级用户审批。纯投影刷新、scanProject 重跑、报告生成属于 AI 自治范围。

## 6. 用户可见输出

输出报告路径、漂移数量、auto/approve/forbid 分组、已执行 action、未执行原因和下一步建议。
