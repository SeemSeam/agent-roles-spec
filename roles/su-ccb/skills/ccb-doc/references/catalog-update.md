# docs-structure-contract 路由与分类变更规则

## 常规文档更新

常规写作不改目录契约。先读取 `docs/.ccb/docs-structure-contract.yaml`，按已有 `doc_type` 和 `human_docs.entries` 选择落位目录、命名规则和拆分方式。

文档地图 `docs/00_文档地图.md` 与 `docs/.ccb/index/` 均为 indexer 派生产物，不在 skill 中手工维护。

## 何时考虑修改契约

- 新增当前契约没有的 `doc_type`。
- 改变已有 `doc_type` 的落位目录、命名规则或 `split_by_part`。
- 改变目录用途、归档语义或文档治理规则。
- 需要新增机器层缓存/协调目录。

## 变更步骤

1. 先回抛 Claude，说明现有契约缺口和建议变更。
2. 获得明确确认后，才修改 `docs/.ccb/docs-structure-contract.yaml`。
3. 同步检查受影响的模板、indexer、文档路由代码或文档说明是否也需要跟进。
4. 回执中说明契约变更、受影响的 `doc_type`、后续是否需要重跑 indexer。

## 注意事项
- 未经 Claude 确认，不自行发明新的分类体系。
- 不新增只服务单个任务的临时分类；优先复用现有 `doc_type`。
- 不手改派生文档地图和缓存。
