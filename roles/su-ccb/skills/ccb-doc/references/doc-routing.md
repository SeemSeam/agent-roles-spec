# 文档路由规则

## 路由真相源

文档分类、命名和落位只以 `docs/.ccb/docs-structure-contract.yaml` 为准。写文档前先读取该契约的 `human_docs.entries`，确认目标 `doc_type`、目录、命名规则和 `split_by_part`。

当前契约中的主要路由：

| doc_type | 落位 | 规则 |
|---|---|---|
| `project_overview` | `docs/00_项目总览.md` | 单文件项目总览。 |
| `doc_map` | `docs/00_文档地图.md` | indexer 自动生成，不手维护。 |
| `architecture` | `docs/01_架构设计/` | `split_by_part: true`，每项目/部分一份活架构。 |
| `requirement` | `docs/02_需求设计/` | 需求本体文档。 |
| `technical_design` | `docs/03_开发计划/` | 需求绑定设计文档。 |
| `dev_task` | `docs/03_开发计划/` | 需求绑定开发任务文档。 |
| `module_spec` | `docs/04_模块规格/` | `split_by_part: true`，命名为 `<部分>-<模块>模块规格.md`。 |
| `lessons` | `docs/05_经验沉淀/` | 经验沉淀。 |
| `adr` | `docs/06_决策记录/` | 命名为 `ADR-NNNN-<slug>.md`。 |
| `archive_index` | `docs/99_归档/归档索引.md` | 归档索引；归档语义主要来自位置。 |

## 派生索引边界

- `docs/00_文档地图.md` 由 indexer 从文档位置、绑定实体状态和文档健康度派生。
- `docs/.ccb/index/` 是 indexer 缓存，已 gitignore，可重建。
- skill 不手动读写派生地图或缓存；需要刷新时在回执说明重跑 indexer。

## 原则
- 不默认创建或更新文档，需先有 Claude 的文档决策。
- 新增 `doc_type`、调整目录用途或命名规则属于目录契约变更，先回抛 Claude 决策。
- 详细内容写到对应人读文档，回执只给更新清单、路由依据和未决问题。
