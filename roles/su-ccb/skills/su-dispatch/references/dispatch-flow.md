# 派工流程

> [v0.3.2-deprecated-reference]
> 本文档自 v0.3.2 起由 `references/kernel/nodes/dispatch.node.md` 与 `references/kernel/registries/transition-table.md` 取代。
> 保留本文只为历史对照；执行规则必须引用 manifest 和 transition-table。

## 前置检查
- v6 runtime preflight 是否通过：`ccb --version`、`ccb ping ccbd`、`ccb ping <agent>`。
- 当前任务是否已有 spec。
- 是否需要先让用户审阅或放行。

## 标准流程
1. 读取 spec 与相关设计路径。
2. 按 ask 合同生成精简派工文本。
3. 使用 `ccb ask [--task-id <id>] <agent>` 提交；同步场景使用 `ccb ask --wait [--task-id <id>] <agent>`。
4. 遇到 async marker 时按前缀匹配 `\[CCB_ASYNC_SUBMITTED[^\]]*\]`，立即结束 turn。
5. 等待 v6 ccbd 自动投递 `CCB_REPLY` 回执。
6. 回调缺失时，允许用 `ccb pend` 兜底。

## Guardrail
- 不在同一 turn 内 poll、sleep 或重复发送 ask。
- 不把完整文档直接粘进去。
- 不把模糊任务伪装成实施任务。
