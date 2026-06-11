# 关于推动 Agent Roles 开放规范的一封信

您好，

我是一名开源作者。从去年底开始，我一直在开发多 agent 协作项目
[`claude_codex_bridge`](https://github.com/SeemSeam/claude_codex_bridge)。
这个项目至今基本保持了接近每天一个版本的更新。

提到这个项目，并不是为了做项目推广，而是想说明：我长期在实践和思考
multi-agent、subagent、agent 协作边界，以及相关能力如何工程化的问题。去年底
社区里对这些模式的讨论还远没有现在这么多。而在持续实践中，我越来越强烈地感到：
我们需要比单个 prompt 或单个 skill 更完整的 agent 能力封装方式。

最近我在推动一个新的开源规范方向：
[`Agent Roles`](https://github.com/SeemSeam/agent-roles-spec)。

我认为，`skill` 是非常重要的一层抽象。它让 agent 可以复用某种能力、知识、
流程或工具调用方式。但当 skills 变多之后，问题也会逐渐显现：不同 skills
容易混杂在一起，管理困难，调用边界不清，权限和工具依赖难以约束，也很难表达
一个专业 agent 真正需要的完整上下文。

随着 multi-agent 和 subagent 的发展，我认为是时候在 skill 之上发展一个更高层级的
概念：`Agent Role`。

简单说，一个 Role 可以理解为：

```text
角色记忆 + skills + 工具依赖 + 权限边界 + host adapter metadata
```

它不是单个 skill，而是一个完整的专业 agent 能力包。一个 Role 可以被挂载到
Codex、Claude Code 或其他 agent host 的某个 agent 上，并尽量与主环境、
用户全局配置和其他 agent 状态保持隔离。这样，开发者不再只是发布零散 skills，
而是可以发布完整的专业角色；用户也不再需要手动拼装 prompts、skills、tools
和权限，而是可以按需安装、更新、挂载或卸载一个 Role。

`Role` 这个概念本身并不新。ChatGPT Store 里的 Custom GPT，更早的
AI 酒馆、角色扮演社区中的 character card / persona，本质上都已经在表达类似
需求：人们希望把某种稳定的身份、行为模式、知识背景和交互方式封装起来，让模型
以特定角色工作。

但我认为，现在真正迫切的不是再次发明“角色”这个词，而是从规范和工程化层面
重新构建这类角色包。

今天我们已经不太满足于每次打开一个 subagent 时，都要重新写一大段提示词；也
不应该把所有 skills 都统一暴露在一个全量 skill 库里，让 agent 自己在混杂能力
中选择。随着 agent 越来越专业化，能力边界、工具依赖、权限范围、上下文记忆和
host 适配方式，都需要被更明确地打包、声明和管理。

因此，一个可移植、可安装、可更新、可快速挂载/卸载的 Role 包规范非常
重要。它有点类似 Claude plugin 的思想，但目标不是某一个平台的插件系统，而是
面向多 agent 生态的开放角色包规范：让一个专业 agent 的 memory、skills、tools、
permissions 和 host adapters 能够作为一个整体被分发和使用。

这也是我希望推动 `Agent Roles` 的原因。它不是单纯做一个新的 marketplace，也
不是复刻 Custom GPT，而是希望把“角色”从产品功能或社区用法，推进到可以被不同
agent host 共同理解和实现的工程标准。

我个人能力有限，很难独自推动这个规范成熟。所以我希望让更多人看到这个方向，
也希望像 OpenAI 这样的头部 agent 公司，以及更广泛的开源社区，能够关注并推动
类似 Role 规范的发展。我的目标不是让大家使用某个具体实现，而是希望这个概念
能够被讨论、改进，并逐渐形成开放标准。

如果您愿意，我非常希望听听您对这个方向的看法，也欢迎对 `Agent Roles` 规范
提出建议。

谢谢。
