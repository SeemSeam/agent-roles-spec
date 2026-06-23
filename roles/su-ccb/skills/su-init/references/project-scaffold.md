# 初始化后生成的项目骨架

> [v0.3.2-deprecated-reference]
> 本文档保留为历史脚手架对照；脚手架说明以 `su-ccb-claude-plugin/references/project-scaffold.md` 为准。
> 新项目结构以 `docs/.ccb/docs-structure-contract.yaml` 和发布模板为准。

```text
CLAUDE.md                              ← 角色+规则+路由指引
AGENTS.md                              ← 角色+规则+路由指引
.claude/settings.json
docs/.ccb/events/
docs/.ccb/drafts/
docs/.ccb/index/
docs/.ccb/config/
docs/.ccb/assets/
docs/03_开发计划/
docs/.ccb/index/project.yaml           ← 非空项目自动扫描生成
```

## 说明
- `CLAUDE.md` 保留角色、硬规则、协商机制、路由指引。不含可变项目事实。
- `AGENTS.md` 保留 Codex 角色、硬规则、三模式行为、路由指引。不含可变项目事实。
- `.claude/settings.json` 承载 hooks 等项目级生效配置。
- `docs/.ccb/events/` 承载 EventJournal 审计流水。
- `docs/.ccb/drafts/` 承载拆分草稿等机制件。
- `docs/.ccb/index/project.yaml` 承载自动扫描的项目事实（技术栈、目录、命令等）。
