# su-archive SC 集成

> [v0.3.2-deprecated-reference]
> 本文档自 v0.3.2 起由 `references/kernel/nodes/archive.node.md` 与 capability registry 取代。
> 保留本文只为兼容对照；v0.3.2 archive 不引入额外 git 收尾 primitive。

## 条件触发
| SC 命令 | 触发条件 |
|---------|---------|
| `/sc:git` | 项目由 CCB 管理 Git 收尾时 |

## 建议触发
| SC 命令 | 触发条件 |
|---------|---------|
| `/sc:document [目标路径]` | Claude 决策需补文档时 |
