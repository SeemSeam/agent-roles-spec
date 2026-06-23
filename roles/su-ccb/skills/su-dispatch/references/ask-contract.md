# Ask Payload Contract

本文件只定义派工请求正文应包含的信息，供 `/ccb:su-dispatch` 组织 prompt 时使用。不定义命令执行方式、等待状态或节点流转规则。

## 目标
派工 payload 应让执行者快速判断范围、风险、输入材料和验收方式；不要把通用开发规范、长文档或无关背景重复粘贴进请求。

## 必传字段
- `mode`：execute / explore / consult。
- `spec_path`：本轮任务 spec 路径。
- `task_goal`：本轮要达成的具体结果。
- `in_scope`：本轮必须处理的文件、模块或行为。
- `out_of_scope`：明确禁止扩散的范围。
- `inputs_to_read`：执行前必须读取的设计、spec 或代码路径。
- `acceptance`：可验证的验收标准。
- `reply_format`：回执格式与长度约束。

## 可选字段
- `risk_level`：low / medium / high。
- `implementation_notes`：已知约束、兼容性要求或推荐做法。
- `allowed_autonomy`：可由执行者自行判断的局部取舍。
- `must_bounce_back`：必须回抛的情况。

## 不传内容
- 大段已有文档原文。
- 与本轮无关的项目通用规范。
- 技术栈常识或可从代码直接读出的信息。
- 模糊目标，例如“顺手优化”“整体看看”。

## Payload 模板
```md
[DISPATCH] <task_id>
mode: execute
spec: docs/03_开发计划/<task>-开发任务.md

## 先读
- <path>

## 本轮做
- <明确范围>

## 本轮不做
- <禁止扩散项>

## 允许自决
- <局部实现取舍>

## 必须回抛
- <设计冲突 / 外部契约变化 / 范围扩大>

## 验收
- <可机械化验证标准>

## 回执
- 修改文件清单
- 验证结果
- 风险点
```
