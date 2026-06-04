# 智能体角色规范

> Agent Roles 是面向专业 AI agent 的通用封装规范，用于定义可移植、可按需装卸的 Role。

一个 Role 将专业 agent 所需的 skills、记忆、工具依赖、plugin 内容和宿主适配元数据集中封装，可挂载到目标项目的某个 agent 上，用完后干净卸载，不影响主环境、用户全局配置和其他 agent 的工作状态。

该规范旨在推动多 agent 协作向更清晰的结构演进：

| 角色 | 变化 |
|------|------|
| **开发者** | 从开发离散 skill 走向开发完整 Role |
| **使用者** | 从分散管理 skills/plugins 走向统一管理 roles |

语言：[简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md) | [更多](README.md)

---

## 为什么需要 Agent Roles

专业 agent 的内容通常分散在多个目录、配置文件和 runtime 中：

- 系统提示词
- 按需拉取的 skills
- 项目记忆与长期记忆
- 工具依赖
- 各宿主环境的适配配置

迁移时需要手动复制、安装和调试；卸载时也难以区分哪些内容属于该 agent、哪些属于主环境或其他 agent。

Agent Roles 将这些内容组织为标准化的 Role 格式，使专业 agent 角色可以像独立单元一样被定义、分发、挂载和卸载。

---

## 核心概念

### Role

Role 是 Agent Roles 的核心对象，表示一个完整的专业 agent 角色。它不只是提示词，也不只是 skill 集合，而是一个携带自身能力、上下文和适配信息的 agent 封装单元。

### Role Definition

Role Definition 是 Role 的定义文件，描述该 Role 的职责、所需 skills、工具依赖、plugin 内容、宿主适配方式，以及挂载和卸载时的处理规则。

### Host Adapter

Host Adapter 描述 Role 如何进入不同宿主环境。同一个 Role 可被多个宿主读取和挂载，Host Adapter 负责表达各宿主在目录结构、配置格式、工具入口和 plugin 投影方式上的差异。

### 包管理与运行时操作

| 操作 | 说明 |
|------|------|
| **Install** | 将 Role 复制、校验并记录到本机 `.roles/installed` store，不修改任何项目配置或宿主 runtime |
| **Update** | 从原始来源刷新一个已经安装的 Role；如果该 Role 尚未安装则失败 |
| **Upgrade** | 面向用户的 update 同义命令；`upgrade --all` 会刷新所有已安装 Role |
| **Mount** | 将 Role 挂载到目标项目，通过索引方式动态加载所需内容，建立 Role 与目标项目、宿主环境之间的连接 |
| **Unmount** | 从目标项目卸载 Role，session 文件按需保留，其余内容即时清除，不影响主环境、用户全局配置和其他 agent 的状态 |

---

## Role 可以携带什么

| 内容 | 说明 |
|------|------|
| `role instructions` | 角色职责、行为边界和工作方式 |
| `skills` | 角色需要使用的能力模块 |
| `memory` | 角色携带的记忆或项目上下文 |
| `tools` | 角色依赖的命令、脚本或外部工具 |
| `plugins` | 角色需要投影到宿主环境的 plugin 内容 |
| `host adapters` | 面向不同宿主环境的适配元数据 |
| `lifecycle rules` | 挂载、更新和卸载时的处理规则 |

---

## 设计目标

- 专业 agent 角色可被清晰定义和独立分发
- Role 可在项目间迁移、按需挂载和干净卸载
- Role 的内容边界明确，不干扰主环境和其他 agent
- 为 CLI、role manager 和 mount runtime 提供统一规范

---

## 包管理器预览

本仓库已经包含预览版 `agent-roles` 包管理 CLI。它的范围刻意小于未来的挂载/卸载 runtime：当前重点是 Role 发现、本地安装、更新、同步、诊断，以及面向宿主适配器的机器可读解析结果。

首个 PyPI 预览版发布后，可以这样安装 CLI：

```bash
pipx install agent-roles
agent-roles --version
```

在受管理的 Python 环境中也可以使用 `pip install agent-roles`。该包会提供
`agent-roles` 命令和 `agent_roles` Python module。

预览命令：

```bash
agent-roles list --json
agent-roles install agentroles.archi --json
agent-roles update agentroles.archi --json
agent-roles upgrade agentroles.archi --json
agent-roles upgrade --all --json
agent-roles sync . --json
agent-roles doctor agentroles.archi --json
agent-roles resolve agentroles.archi --json
```

`install` 是包 store 操作，不是运行时挂载。`update` 只刷新已经安装的单个
Role，不会在缺失时静默变成安装。`upgrade` 是面向用户的 update 同义命令，
`upgrade --all` 会刷新所有已安装 Role。

默认情况下，CLI 会从当前 catalog-like 目录发现 Roles，也会把公开
`agent-roles-spec` catalog clone 到 `~/.roles/catalogs` 后读取。可以通过
`AGENT_ROLES_STORE` 指定 store root，通过 `AGENT_ROLES_SPEC_HOME` 或
`AGENT_ROLES_CATALOG` 指定本地 catalog，并用 `AGENT_ROLES_NO_REMOTE=1` 禁用默认 Git catalog。

仓库内的 `cli/agent-roles` wrapper 和 `python -m agent_roles` 会调用同一个
CLI module。Host Adapter 应消费 JSON 输出；实时 `mount` 和 `unmount` 命令会等 Host Adapter 契约稳定后再补充。

---

## 当前状态

> 规范仍处于早期设计阶段。

当前重点：

- Role 的概念边界与 Role Definition 结构
- skills、memory、tools、plugins 的组织方式
- Host Adapter 的表达方式
- 预览版包管理 CLI 与 `.roles` store 行为
- mount / unmount 的最小行为约束

后续将补充 schema 扩展、examples、role manager 集成，以及实时 mount/unmount runtime。

---

## 适配计划

Host Adapter 的开发将率先面向以下多智能体项目展开：

- [CCB（claude_codex_bridge）](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

同时也将为 Claude Code、Codex 等主流 host 开发对应的 adapter，并积极推动各平台对 Role 格式的原生支持。
