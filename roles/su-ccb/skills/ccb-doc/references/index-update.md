# 派生索引边界

## 不手工维护的产物

- `docs/00_文档地图.md`
- `docs/.ccb/index/`

这些内容由 indexer 从人读文档、文档位置、实体状态和文档健康度自动派生。skill 不直接读写它们，也不把它们当成业务真相。

## 文档更新后的处理

- 常规写作只更新对应人读文档。
- 若文档新增、移动、归档或实体状态变化可能影响投影，在回执中说明需要重跑 indexer。
- 若 indexer 结果异常，优先检查人读文档 frontmatter、路径和 `docs/.ccb/docs-structure-contract.yaml`，不要手改派生缓存。
