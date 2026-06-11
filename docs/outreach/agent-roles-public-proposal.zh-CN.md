# 提案：Agent Roles —— 面向多 agent 系统的可移植角色规范

过去几个月，我一直在维护一个多 agent 协作开源项目 [`claude_codex_bridge`](https://github.com/SeemSeam/claude_codex_bridge)。在持续实践中，有一个反复出现的问题推动我拆出了一个独立的规范项目：[`Agent Roles`](https://github.com/SeemSeam/agent-roles-spec)。

问题是：随着 agent 配置越来越复杂，skills 很容易积累，却很难作为一个系统来管理。每新增一个 skill，它都会混入共享能力池；工具依赖逐渐模糊；每次为了特定职能启动一个 subagent，又常常需要重新写一大段临时提示词来解释同样的上下文。我们缺少一个围绕“专业 agent”的清晰包边界。

## 核心想法

Role 是比 skill 更高一层的单位。skill 描述的是一个可复用能力，而 Role 描述的是一个完整的专业 agent：

```text
role memory + skills + tool dependencies + permission boundaries + host adapter metadata
```

我的设想是，Role 应该是一种静态、可移植的定义：可以从 catalog 安装，可以挂载到某个 agent host 中，也可以卸载而不污染主环境。Role 源内容不应该保存项目状态或会话历史。Host 可以根据 Role 源内容生成投影输出，但这些输出不应该再写回 Role 本身。

## Role 不是新概念

ChatGPT Store 里的 Custom GPT、AI 角色扮演社区里的 character card，本质上都在指向类似需求：稳定、可复用的 agent 身份，带有特定行为、知识和交互模式。Claude Projects、Copilot instruction files 以及类似平台内 persona 系统，也都在各自产品内部处理这一类问题。

这些系统通常不需要解决的是更工程化的打包问题：跨不同 host 的可移植性、声明式工具依赖、生命周期管理（install / update / mount / unmount），以及脱离单一产品生态后的互操作性。这正是 Agent Roles 想尝试补上的空缺。

## 目前已有内容

这个仓库已经有一个工作中的预览版本：

- `specs/role-v1.md` 和 `specs/metadata-v1.md` 描述 Role 目录结构和 `role.toml` 定义格式
- npm CLI `agent-roles`（当前版本 `0.1.1`）可以从远程 catalog 列出和安装 Roles
- 一个参考 Role：`agentroles.archi`，用于展示架构审查角色的具体格式

当前 v0.1 规范刻意保持保守：permissions 只是声明式建议，并不执行强制隔离；跨 host 绑定还是一个概念，而不是强制文件格式；runtime mount 和 hot reload 也暂时推迟。这个阶段的目标，是先把静态 Role 定义形状讨论清楚，再在上面增加生命周期机制。

## 希望获得反馈的问题

**关于定义格式**：目前使用 `role.toml` 作为 Role manifest，因为它可读、轻量，对工具要求低。但我并不执着于 TOML。如果从实际工具链角度看，其他格式会更好吗？

**关于权限**：`role.toml` 里的 `[permissions]` 目前是高层声明，例如 `read_files = true`、`write_files = false`、`network = false`。这让预览规范不需要先实现完整权限 runtime，但也意味着这些声明本身并不强制生效。对一个预览规范来说，这是合理折中，还是会让 permissions 章节显得误导？

**关于范围**：这个规范刻意描述可移植的 Role artifact，而不是 marketplace 或 host runtime。我希望 core format 保持 host-neutral，让不同 agent hosts 可以各自实现 adapters，而不被绑定到某一种实现。这个 framing 是否成立？还是说，没有先锚定一个具体 host，它会显得过于抽象？

**关于概念本身**：也许现有 plugin 系统已经能解决这个问题，或者我把问题放在了错误的抽象层。如果这个 framing 有明显缺口，我希望尽早听到反对意见。

Project: <https://github.com/SeemSeam/agent-roles-spec>

如果你正在做 agent platform、coding-agent host 或 multi-agent system，并且对这个方向有想法，包括怀疑和反对意见，我都非常希望听到。
