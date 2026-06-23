---
name: ccb-doc
description: >
  Create or update project documentation according to CCB document routing rules.
  Use when Claude asks to write docs, route documents by the docs structure contract,
  or archive implementation details.
metadata:
  short-description: CCB 文档维护
---

# CCB 文档维护

## 触发条件
- Claude 明确要求更新文档。
- 任务完成后需要归档模块现状、经验沉淀或详细接口说明。
- 需要按当前 docs 模型判断文档分类、命名和落位。

## 输入
- Claude 的文档更新指令。
- `docs/.ccb/docs-structure-contract.yaml`。
- 相关 spec、设计和实现结果。

## 执行流程
1. 读取 `docs/.ccb/docs-structure-contract.yaml`，按 `human_docs.entries` 确定 `doc_type`、落位目录、命名规则和 `split_by_part`。
2. 若 `doc_type` 或目录用途不存在，先回抛给 Claude，确认是否需要修改目录契约。
3. 根据已有结构和风格创建或更新文档。
4. 不手动维护 `docs/00_文档地图.md` 或 `docs/.ccb/index/`；它们由 indexer 从文档位置、实体状态和文档健康度自动派生。
5. 归档实际现状、踩坑记录、详细接口说明或扩展设计文档。
6. 返回更新文件清单与简要说明，必要时说明需重跑 indexer。

## 输出格式
- 更新了哪些文档。
- 使用了哪个 `doc_type` 和落位规则。
- 是否需要重跑 indexer 刷新派生文档地图/缓存。
- 还需 Claude 决策的事项。

## 停止条件
- 文档已按分类正确落位。
- 未手改派生索引或缓存。
- 返回结果可供 Claude 归档。

## 升级条件（回抛给用户）
- 文档分类不存在且需新增或修改目录契约。
- Claude 未明确是否允许补文档。
- 当前实现不足以支撑准确文档化。
