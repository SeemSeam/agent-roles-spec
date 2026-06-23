# su-init SC 集成

> [v0.3.2-deprecated-reference]
> 本文档保留为初始化依赖检查对照；项目脚手架规则自 v0.3.2 起以 `su-init/SKILL.md`、`references/project-scaffold.md` 和 `references/kernel/` 为准。
> 不得在本文新增 kernel 规则。

## 条件触发
| SC 命令 | 触发条件 |
|---------|---------|
| `/sc:load` | 需要 SuperClaude 会话加载能力时 |

## 依赖检查
`/ccb:su-init` 负责检查 SuperClaude 安装状态，输出 Installed / Partial / Missing。
