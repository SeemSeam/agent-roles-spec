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

每个 Role Definition 都携带 Role 修订元数据。`version` 是 Role 自己的语义
版本，独立于 `agent-roles` 的 npm/PyPI 包版本；发布到 catalog 的 Role 还应
包含 `created_at`、`updated_at` 和 catalog 等级，方便用户和 Host 在安装、
更新或挂载前比较 Role 修订。

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

## 已发布正式 Roles

当前 catalog 中已经发布的正式 Role 如下。每个条目都可通过 `agent-roles`
安装，并可提供面向不同 host 的 adapter。

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer（架构评审）</summary>

- **版本**: `0.2.2`
- **等级**: `stable`
- **用途**: 评审架构漂移、边界、耦合、可维护性和结构风险。
- **适合场景**: 架构评审、依赖边界检查、耦合分析，以及实用的后续步骤排序。
- **包含内容**: Role instructions、架构评审 skills、可复用 prompt、工具文档、plugin 内容和 host adapters。
- **Adapters**: CCB、Claude Code、Codex、HIVE。
- **安装**: `agent-roles install archi`
- **更新**: `agent-roles update archi`
- **源码**: [`roles/archi`](../../roles/archi/)

</details>

---

## 包管理器预览

本仓库已经包含预览版 `agent-roles` 包管理 CLI。它的范围刻意小于未来的挂载/卸载 runtime：当前重点是 Role 发现、本地安装、更新、同步、诊断，以及面向宿主适配器的机器可读解析结果。

当前公开预览版优先通过 npm 安装：

```bash
npm install -g agent-roles
agent-roles --version
```

npm 包会通过 Node wrapper 提供 `agent-roles` 命令，并调用随包发布的 Python
module，因此需要 `PATH` 中有 Python 3.11+。PyPI 包已经准备好，但仍在等待
trusted publishing 配置完成；正式上线后，`pipx install agent-roles` 和
`pip install agent-roles` 也会提供同一个命令和 `agent_roles` Python module。

npm 包不会内置可安装的 `roles/` catalog。Role catalog 变更通过 GitHub
catalog 发布，所以新增或更新 Role 不要求同步发布 `agent-roles` npm/PyPI 包。
请用 `agent-roles list` 从已配置 catalog 发现可用 Roles，再用
`agent-roles install <role>` 按需安装。`archi` 这类短名 alias 会解析到
`agentroles.archi` 这样的 canonical catalog ID。

预览命令：

```bash
agent-roles list
agent-roles install archi
agent-roles install --all
agent-roles update archi
agent-roles upgrade archi
agent-roles upgrade --all
agent-roles sync .
agent-roles doctor archi
agent-roles resolve archi
```

`install` 是包 store 操作，不是运行时挂载。`update` 只刷新已经安装的单个
Role，不会在缺失时静默变成安装。`upgrade` 是面向用户的 update 同义命令，
`upgrade --all` 会刷新所有已安装 Role。`install --all` 会安装当前可发现的
所有 catalog Roles。Adapter 或自动化流程需要机器可读输出时再添加 `--json`；
JSON 输出会包含 Role `version`、`catalog_level`、digest、`update_reason`，
以及源 Role 提供的修订时间戳。同版本内容补丁可以只通过 digest 变化表达，
不需要发布新的 `agent-roles` 包版本。

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
