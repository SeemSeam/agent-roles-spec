---
name: ccb-execute
description: >
  Execute CCB implementation, explore, or consult tasks from Claude based on spec/docs,
  validate the result, and return a compact receipt.
  Use when Claude sends a CCB task with execute/explore/consult mode.
metadata:
  short-description: CCB 执行、协商与回执
---

# CCB 执行

## 触发条件
- Claude 通过 ask 派发了实施任务、勘探任务或协商请求。
- 当前任务已有 spec 或明确的文档路径。
- 需要按 CCB 回执合同或协商契约返回结果。

## 输入
- Claude 提供的 ask 指令（含 mode 标记）。
- `docs/.ccb/specs/active/*.md`。
- 按需读取的架构、需求、计划、模块与经验文档。
- 当前项目代码与配置。

## 同组对端路由

当 Codex 侧需要判断 CCB consult / dispatch 的默认对端，必须读取项目内同一份 kernel 约定：

- `references/kernel/agent-routing-contract.md`

可调用本 skill 自带脚本解析当前项目拓扑：

```bash
node <ccb-execute-skill-dir>/scripts/resolve-same-group-peer.mjs \
  --project-root "$PWD" \
  --current-agent "$CCB_CALLER_ACTOR" \
  --pretty
```

脚本读取 `<project>/.ccb/ccb.config` 的 `[windows]`，按“当前 agent → 同 window → 唯一互补 provider”返回 JSON：

- `{"kind":"peer","peer":"...","window":"..."}`：可作为默认同组对端。
- `{"kind":"ambiguous",...}` / `{"kind":"no_peer",...}`：必须要求显式 target，不得猜 `main_codex` 或按 `slot` 字符串推断。

测试向量见 `references/agent-routing-test-vectors.json`，与 Claude plugin PR1 resolver 行为对齐。若项目缺少 `agent-routing-contract.md`，视为契约不可确认，要求显式 target。

## per-需求 worktree 执行纪律

当 dev_task frontmatter 含 `code_workspace` 时，`ccb-execute` **只消费 plugin dispatch 已建好的 worktree**，绝不执行 `git worktree add/remove` 或自行创建目录。实施前必须 fail-fast 校验：

```bash
node <ccb-execute-skill-dir>/scripts/ccb-execute-worktree.mjs validate-worktree \
  --project-root "$PWD" \
  --spec "<dev_task.md>" \
  --pretty
```

校验读取 `code_workspace.path` / `code_workspace.branch`，计算主空间 `codeRoot = resolve(canonicalRoot, path)`，并确认 codeRoot 已存在且当前分支等于声明分支。字段缺失、path 不存在、branch 不匹配时，停止实施并回执拒绝原因；不要让 Codex 自己 ensure。

dispatch brief 若附运行态空间表，必须同时消费该表。`canonicalRoot` 是主仓，专用于读取人读 docs 和经 plugin lib 写 `docs/.ccb`；主空间的 `codeRoot = resolve(canonicalRoot, code_workspace.path)`，专用于代码改动、git、测试和构建。若该需求声明多个实施空间，按 brief 空间表分别使用各空间自己的 codeRoot；字段缺失、路径不存在或分支不匹配时拒绝实施。

路径纪律：

1. `canonicalRoot` 是 ccb 启动 cwd / 主仓，只用于读取 spec、人读 docs，以及以绝对路径读写 `docs/.ccb` 真相。
2. `codeRoot` 是 worktree；所有代码编辑、构建、lint、test 命令都必须以对应空间的 `cwd=codeRoot` 执行。
3. git 命令必须写成 `git -C "$codeRoot" ...`，不得在主仓 cwd 下只传代码文件绝对路径。
4. 多空间任务的路径纪律、验证和 auto-commit 按空间分别生效；跨空间改动不得混在同一个 git 工作区提交。
5. 不得把 canonical `docs/.ccb` 写入 worktree；commit 前必须运行 commit-guard。
6. 不得手工 bump root 的 submodule gitlink；空间间版本关联由 worktree association executor 统一同步和 verify。

子任务级验证与 auto-commit：

```bash
node <ccb-execute-skill-dir>/scripts/ccb-execute-worktree.mjs commit \
  --project-root "$PWD" \
  --spec "<dev_task.md>" \
  --pretty
```

该脚本会解析 spec 中 `## 验证`（兼容 `### 验证`）下第一个 fenced block 的逐行命令，并在 `codeRoot` 中运行。所有命令 exit 0 时 commit 标记为 `verified`；无验证块时仍可 commit，但标记为 `unverified`，回执必须显式说明“未独立验证”，review/archive 不得等价为已验证。验证失败时脚本返回 `validation_failed` 且不 commit。

commit-guard 也可单独运行：

```bash
node <ccb-execute-skill-dir>/scripts/ccb-execute-worktree.mjs guard-docs-ccb \
  --code-root "$codeRoot" \
  --pretty
```

guard 使用 `git status --porcelain=v1 --untracked-files=all -- docs/.ccb` 检查 staged、unstaged、untracked 三态；任一 `docs/.ccb` 改动都会拒绝 commit。执行回执必须带 auto-commit 结果：验证命令列表、每条 exit code、`verified|unverified|validation_failed`、commit sha 或拒绝原因。

## 三模式行为

### mode: execute（执行模式，默认）
1. 先读 spec，再读相关文档，再看现有实现，最后判断边界。
2. 默认采用半开放实施模式，对实现负责，但不擅自更改高影响决策。
3. 做最小充分改动，允许局部整理与有限重构。
4. 验证是交付的一部分，明确跑了什么、结果如何、哪些未覆盖。
5. 按 `receipt-contract` 生成精简回执。

### mode: explore（勘探模式）
1. 不写代码，返回现状、风险、建议切分与待拍板问题。
2. 如遇高影响决策、任务模糊、范围扩大、设计冲突等情况，立即回抛给 Claude。

### mode: consult（协商模式，v0.2 新增）
1. **只读/分析/推理，不修改任何文件。**
2. 读取 Claude 指定的代码和文档，分析现状。
3. 遵循 evidence-before-conclusion：先列 findings，再给 recommendation。
4. 按 `consult-contract` 格式回复，包含 `analysis_depth_hint` / `hint_reason` / `hint_confidence`。
5. 详见 `references/consult-contract.md`。

## Superpowers 协调

不同模式下 Superpowers 的适用边界不同：

| Superpowers Skill | 执行模式 | 协商模式 |
|---|---|---|
| `executing-plans` | ✅ 适用 | ❌ 不适用 |
| `systematic-debugging` | ✅ 适用 | ⚠️ 仅故障分析咨询 |
| `verification-before-completion` | ✅ 适用 | ❌ 不适用（替代为 evidence-before-conclusion） |
| `receiving-code-review` | ✅ 返工时 | ❌ 不适用 |

详见 `references/superpowers-integration.md`。

## 输出格式

### 执行/勘探模式
- 结果摘要。
- 修改文件或勘探输出。
- 验证结果。
- 风险点。
- 建议补文档项。

### 协商模式
- mode / status / understanding / findings / options / recommendation / rationale / risks / assumptions / open_questions / analysis_depth_hint / hint_reason / hint_confidence

## 停止条件
- 执行/勘探：目标已完成 + 已验证 + 已输出回执。
- 协商：已按 consult-contract 格式回复。

## 升级条件（回抛给 Claude）
- 需求不清楚，无法确定正确做法。
- 现有设计与代码冲突，无法判断以哪个为准。
- 外部契约、数据结构、跨模块依赖、状态流或事务流需要变化。
- 改动范围明显扩大，或继续实施会引入更大风险。
- 协商模式下：`status=blocked` 或 `status=insufficient-context`。
