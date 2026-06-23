---
schema_version: ccb-kernel-glossary-v1
status: active
introduced_by: ADR-0030
updated_at: 2026-05-21
---

# Kernel Glossary

本词典服务两个目标：让用户能读懂 plugin 的工作记录，也让 AI 在降智期不因为术语模糊而漂移。术语保留，但每个术语都先解释它解决的业务问题。

## 核心工作流术语

### 节点

节点是一个 AI 工作模式，例如“需求分析”“技术设计”“审查”。它不是按钮步骤，也不是函数调用；AI 根据用户意图和当前上下文判断自己应该进入哪个节点。

### Manifest

Manifest 是节点说明书，描述“什么时候进入、怎么做、什么时候完成、不能做什么”。ADR-0030 后的 manifest 使用 Markdown，让 AI 和用户都能直接读懂。

### Kernel

Kernel 是 plugin 内部的协作规则集合，包含节点 manifest、必问清单、词典和历史协议文件。它的业务作用是让不同 AI 在同一套规则下工作。

### Skill

Skill 是用户触发 plugin 的指令入口，例如 `/ccb:su-flow` 或 `/ccb:su-review`。Skill 负责解释用户意图、声明可用节点集，并把 AI 带到合适的工作模式。

### Plugin 域

Plugin 域指项目内由 plugin 直接读写和维护的工作记录区域，例如 `docs/.ccb/`。Console 可以展示它，但业务推进的真相不依赖 Console。

### Spec

Spec 是沉淀后的需求、设计或派工说明。它把 AI 与用户达成的共识写成可审查、可执行、可追溯的文档。

## 多 AI 协作术语

### Agent

Agent 是参与协作的 AI 角色，例如 Claude、Codex 或未来的 Gemini。Claude 通常负责主驾驶判断，Codex 负责独立审视、质疑和补盲点。

### Sc 指令

Sc 指令是 SuperClaude 提供的专家能力，例如 `/sc:analyze`、`/sc:design`、`/sc:research`。它的业务作用是给节点工作增加专家视角，减少单一 AI 的盲点。

### EventJournal

EventJournal 是 AI 工作的审计日志，记录协商、反思、用户拍板和关键动作。用户可以通过它追溯“AI 为什么这么做”。

### Decision Card

Decision Card 是高影响决策的说明卡。v1.x 主要用自然语言记录；结构化 schema 预留到 v1.5+。

### Agent Reply Review

Agent Reply Review 是 Claude 收到 Codex 回复后的反思记录，至少包含“我同意的、我不同意的、我的盲点、接下来做什么”。它防止 Claude 当传话筒。

## 运行环境术语

### Anchor

Anchor 是 AI 工作的物理环境，通常包含项目目录、工作树和一组 agent pane。用户可以把它理解成“AI 团队在这个任务上的工位”。

### Ccbd

Ccbd 是 CCB 的后台 daemon，负责 agent 间消息投递、队列和会话通信。它是通信基础设施，不是业务决策者。

### Dispatch

Dispatch 是把一个明确任务派给执行 agent 的动作。业务问题是“谁来做、做什么、边界是什么、完成后怎么回执”。

### Projection

Projection 是从 plugin 真相源派生出来的展示镜像。Console 看到的很多数据是 projection；它方便查询和展示，但不应该成为业务真相。

### Runtime

Runtime 是保证 plugin 工作可靠运行的底层管家，负责写入、并发、安全兜底等基础能力。业务目标是让多个 AI 同时工作时不互相踩踏。

## 工程决策术语

### ORM

ORM 是数据库访问层抽象，例如 Prisma 或 Drizzle。它解决“AI/程序如何安全、统一地读写数据库”的问题。

### Schema

Schema 是数据结构定义，可以是数据库表、JSON 文件或 API 输入输出格式。它解决“大家对字段含义是否一致”的问题。

### Migration

Migration 是数据库 schema 升级，例如加字段、改类型或删表。它可能影响已有数据，所以命中必问清单时必须先问用户。

### CAS

CAS 是 Compare-And-Swap，业务含义是“先确认自己看到的版本没变，再写入”。它防止两个 AI 同时改同一份内容时互相覆盖。

### Fail-Closed

Fail-closed 是失败时保守拒绝。业务含义是“如果看不清风险，就先停下来，避免造成不可逆损害”。

### Fail-Open

Fail-open 是失败时允许继续，但必须记录审计。业务含义是“这件事风险低，不必阻塞用户，但事后要能追溯”。
