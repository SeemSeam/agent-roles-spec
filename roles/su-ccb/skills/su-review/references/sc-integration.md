# su-review SC 集成

> [v0.3.2-deprecated-reference]
> 本文档自 v0.3.2 起由 `references/kernel/nodes/review.node.md` 与 capability registry 取代。
> 保留本文只为兼容对照；verification 是否 advisory 以 manifest / capability 为准。

## 必须触发（前提：项目有对应能力）
| SC 命令 | 触发条件 |
|---------|---------|
| `/sc:build` | 项目有构建路径 |
| `/sc:test` | 项目有测试套件 |

## 建议触发
| SC 命令 | 触发条件 |
|---------|---------|
| `/sc:analyze [变更文件]` | 审查发现需深度代码分析 |
