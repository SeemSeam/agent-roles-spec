# Agent Roles

从 Skills 到 Roles。

Agent Roles 是一个 host-neutral 通用规范，用来把专业 AI agent 打包成可移植、
可挂载的 RolePack。

对开发者：从 Skills 开发走向 Roles 开发。  
对使用者：从分散的 skills 和 plugins 管理走向清晰的 roles 管理。

一个 RolePack 可以携带自己的记忆、skills、prompts、工具、plugin 内容和
host 适配元数据，然后作为隔离的专业 agent 挂载到兼容项目。

规范先行。CLI、role manager 和 mount runtime 后续跟进。

语言：[English](README.md) | [简体中文](README.zh-CN.md) |
[繁體中文](README.zh-TW.md) | [更多译文](docs/i18n/)

> 本译文跟随 `README.md`。如果存在差异，以英文版本为准。

## 为什么需要 Agent Roles

Skills 是能力。Roles 是可部署的专业 agent。

一个 skill 让 agent 学会一项能力。一个 role 定义这个 agent 是谁、负责什么、
携带什么记忆、拥有哪些 skills 和工具，以及 host 如何安全地挂载和卸载它。

Agent Roles 不替代 skills 或 plugins。它把它们组织成完整、可移植的 roles。

## 什么是 RolePack

RolePack 是一个面向专业 agent role 的可移植包。

一个 RolePack 可以包含：

- role 身份和职责
- role 记忆
- skills
- prompts 和模板
- 工具脚本和工具文档
- role 自带的 plugin 内容
- MCP 配置或示例
- host 适配元数据
- 验证和兼容性测试

目标很简单：一个 role 目录应该描述并携带理解、验证和挂载这个 role 所需的
内容。

这里的 plugin 内容指 role 包内部携带的 host 原生 plugin 文件，不表示必须安装
全局 plugin，也不表示需要外部 plugin manager。

## 从 Skills 开发到 Roles 开发

Skill 开发通常交付的是孤立能力。

Role 开发交付的是完整专业 agent。

开发者不需要只发布单个 skill，然后让用户手动组合记忆、工具、plugins 和
host 配置；开发者可以把整个 role 打包成 RolePack。

写 skills，交付 roles。

## 从 Skills 管理到 Roles 管理

管理分散的 skills 和 plugins 很脆弱。

用户需要理解要安装什么、怎么组合、依赖哪些工具、会写入哪些文件，以及如何
清理。

Role 管理更直接：挂载一个 RolePack，得到一个专业 agent。卸载它时，生成的
role 资产也应该随之移除。

## 项目范围

Agent Roles 首先是一个规范项目。

前期版本聚焦于：

- RolePack 包目录结构
- role 元数据约定
- 验证规则
- 禁止携带 secret 和 runtime state 的规则
- reference roles
- templates
- host adapter contracts
- conformance tests

规范先行。CLI、role manager 和 mount runtime 后续跟进。

## Hosts 和 Adapters

Agent Roles 是 host-neutral 的。

Host adapter 描述特定 host 将如何消费 RolePack，并把它的内容投影到运行中的
agent 环境。

计划中的 adapter contracts 包括：

- Claude Code
- Codex
- CCB
- Hive

Adapter 可以把 RolePack 内容映射到 host 原生概念，例如 subagents、skills、
plugins、commands、MCP servers、memory files 或 managed provider state。

## 仓库结构

```text
agent-roles/
  specs/              # RolePack 规范
  schemas/            # 验证 schema
  templates/          # RolePack 起始模板
  reference_roles/    # 官方示例 roles
  adapters/           # Host adapter contracts
  conformance/        # 兼容性测试和 fixtures
  cli/                # 未来 CLI 实现
```

一个具体 role 可以长这样：

```text
reference_roles/
  archi/
    README.md
    role.toml
    memory.md
    skills/
    prompts/
    tools/
    plugins/
    adapters/
    tests/
```

## 路线图

### v0.1 Spec Preview

- RolePack package spec
- role metadata conventions
- forbidden-state rules
- starter templates
- first reference roles

### v0.2 Community Roles

- contribution guide
- role quality checklist
- more reference roles
- role gallery

### v0.3 Host Adapter Contracts

- Claude Code adapter contract
- Codex adapter contract
- CCB adapter contract
- Hive adapter contract

### v0.4 Conformance Harnesses

- adapter output validation
- generated asset ownership checks
- mount/unmount compatibility tests

### v0.5 CLI Preview

- validate RolePacks
- 在有意义时 render host-specific assets
- 为部分 host 提供 mount/unmount 原型

## 非目标

Agent Roles 第一版不是：

- registry
- security sandbox
- multi-agent scheduler
- provider session manager
- CCB runtime extraction
- host-specific plugin manager

Runtime management 会在 RolePack 规范稳定后推进。

## 贡献

欢迎贡献 RolePack。

一个好的 role 应该有清晰目的、明确职责、实用 skills 或工具、文档化边界，并且
不包含 secrets、credentials、provider sessions 或 runtime state。

详细贡献规则会放在 `CONTRIBUTING.md`。
