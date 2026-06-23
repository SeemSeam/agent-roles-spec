# CCB 项目脚手架

## 初始化后应存在的目录

```text
.
├── CLAUDE.md                          ← 角色+规则+路由(读取入口指向 00_ + 目录契约)
├── AGENTS.md                          ← 同上(Codex 运行时)
├── .claude/
│   └── settings.json
└── docs/
    ├── 00_项目总览.md                  ← 项目全貌入口(从 _模板_项目总览 起)
    ├── 00_文档地图.md                  ← 全量文档索引(indexer 自动生成)
    ├── 01_架构设计/   02_需求设计/   03_开发计划/
    ├── 04_模块规格/   05_经验沉淀/   06_决策记录/    ← 各含 _模板_*.md
    ├── 99_归档/
    └── .ccb/                           ← 机器层:索引+协调,不存需求/任务本体
        ├── docs-structure-contract.yaml ← 目录契约(结构/产物落点/字段规则真相源)
        ├── config/                       ← 项目级可选配置目录(默认不写 capability override)
        ├── schemas/
        ├── index/                       ← 索引缓存(自动生成,可重建) + project.yaml(扫描生成)
        ├── events/journal.jsonl         ← 流水账
        ├── locks/                        ← 写锁
        ├── drafts/breakdown/             ← 拆分草稿(机制件)
        └── assets/
```

## 知识库脚手架（默认开启）
- 默认行为：建 `docs/.ccb/` 的同时，补建人读知识库 `docs/00_*` ~ `docs/06_决策记录/` + `99_归档/`，并从 plugin 的 `templates/docs/**` **复制对应 `_模板_*.md`** 到各目录(模板是可复制骨架,**非 `[待填写]` 占位**)。
- 使用 `--no-with-kb` 时，跳过人读知识库，只建 `docs/.ccb/`。
- 若目标目录/文件已存在（含同序号前缀，如 `docs/01_*`），视作已有，不覆盖、不删。

## 初始化动作
- 创建或更新 `CLAUDE.md` / `AGENTS.md`（角色+规则+路由，读取入口指向 `00_项目总览` + `00_文档地图` + 目录契约）。
- 创建 `.claude/settings.json`，写入 hooks 与项目级允许配置。
- 复制 `docs-structure-contract.yaml` 到 `docs/.ccb/`（目录契约运行副本）。
- 创建 `docs/.ccb/{schemas,index,events,locks,drafts,config,assets}/` 机器层目录。
- 从 `templates/docs/**` 复制人读模板到 `docs/00_*` ~ `06_*`。
- **非空项目**：扫描项目事实写入 `docs/.ccb/index/project.yaml`；**空项目**：延迟到首次 `/ccb:su-flow`。
- 索引（`00_文档地图` + `.ccb/index/` 缓存）由 indexer **自动生成**，不手建手维护的 YAML 索引。

## dev_task 状态字段

任务状态写在 `docs/03_开发计划/*开发任务.md` frontmatter，并由受治理写入更新：

| 字段 | 用途 |
|---|---|
| `doc_type: dev_task` | 文档类型 |
| `task_id` | 任务实体 ID |
| `current_node` | canonical node ID |
| `node_substate` | 节点内子状态 |
| `status` | reviewing / done / cancelled |
| `review_status` | passed / failed（review 后写入） |

字段定义引用 `references/kernel/state-schema.yaml` 和 `docs/.ccb/docs-structure-contract.yaml`。

## Kernel reference

初始化后下游项目持有 `references/kernel/` 快照，来源为 plugin distribution snapshot；运行时引用项目内相对路径：

- `references/kernel/`
- `references/kernel/nodes/*.node.md`
- `references/kernel/glossary.md`
- `references/kernel/must-ask-checklist.md`

## 更新策略
- 如果目标文件已存在且带有 marker，则只更新 marker 内内容。
- 如果目标文件存在但无 marker，则在末尾追加 CCB 段落。
- 如果目录已存在，则只补缺，不删除用户自定义内容。
- **永远不生成 `[待填写]` 占位符。**
