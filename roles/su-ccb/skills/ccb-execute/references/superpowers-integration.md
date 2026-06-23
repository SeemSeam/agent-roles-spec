# Superpowers 集成边界

## 概述

Codex Superpowers 在执行模式和协商模式下有不同的适用边界。
Superpowers 是 Codex 自身解析处理的，不需要手动触发或指令调用。

## 双模式边界表

| Superpowers Skill | 执行模式 | 协商模式 | 说明 |
|---|---|---|---|
| `executing-plans` | ✅ 适用 | ❌ 不适用 | 协商不涉及计划执行 |
| `systematic-debugging` | ✅ 适用 | ⚠️ 仅故障分析咨询时 | 协商主题是故障诊断时可用 |
| `verification-before-completion` | ✅ 适用 | ❌ 不适用 | 协商替代为 evidence-before-conclusion |
| `receiving-code-review` | ✅ 返工时适用 | ❌ 不适用 | 协商不涉及代码审查返工 |
| `brainstorming` | ❌ Claude 侧 | ❌ Claude 侧 | 发散探讨由 Claude 通过 /sc:brainstorm 驱动 |
| `writing-plans` | ❌ Claude 侧 | ❌ Claude 侧 | 计划编写由 Claude 通过 /su:plan 驱动 |

## 执行模式详细

| Superpowers Skill | 触发级别 | 触发条件 | 说明 |
|---|---|---|---|
| `executing-plans` | 条件 | 已有明确 plan 且进入执行态 | 按计划推进实施 |
| `systematic-debugging` | 必须 | 遇到 bug/异常/测试失败 | 先定位再修复 |
| `verification-before-completion` | 必须 | 准备宣称完成 | 先验证再宣称 |
| `receiving-code-review` | 条件 | 根据审查意见返工 | 验证评审意见 |

## 协商模式详细

### evidence-before-conclusion（协商模式替代 verification-before-completion）

含义：Codex 在给出建议前必须先列出证据。

具体要求：
- 不从直觉直接跳到推荐
- 先列出从代码/文档中观察到的事实
- 基于事实列出可行方案
- 然后才给出推荐和理由
- 证据不足时明确标记 `status: insufficient-context`

### systematic-debugging 在协商模式下的限制

仅当满足以下条件时适用：
- 协商主题明确是故障分析（`decision_scope: debugging`）
- Claude 请求中包含具体的错误/异常描述
- 分析过程不修改任何文件

不适用：
- 前向设计讨论
- 架构方案评估
- 可行性分析

## 降级策略

Superpowers 未安装时：
- Codex 使用自身基础能力完成执行和分析
- 不报错，不阻塞
- 执行质量可能略低，但核心流程不受影响
