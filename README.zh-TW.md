# Agent Roles

從 Skills 到 Roles。

Agent Roles 是一個 host-neutral 通用規範，用來把專業 AI agent 打包成可攜、
可掛載的 RolePack。

對開發者：從 Skills 開發走向 Roles 開發。  
對使用者：從分散的 skills 和 plugins 管理走向清晰的 roles 管理。

一個 RolePack 可以攜帶自己的記憶、skills、prompts、工具、plugin 內容和
host 適配元資料，然後作為隔離的專業 agent 掛載到相容專案。

規範先行。CLI、role manager 和 mount runtime 後續跟進。

語言：[English](README.md) | [简体中文](README.zh-CN.md) |
[繁體中文](README.zh-TW.md) | [更多譯文](docs/i18n/)

> 本譯文跟隨 `README.md`。如果存在差異，以英文版本為準。

## 為什麼需要 Agent Roles

Skills 是能力。Roles 是可部署的專業 agent。

一個 skill 讓 agent 學會一項能力。一個 role 定義這個 agent 是誰、負責什麼、
攜帶什麼記憶、擁有哪些 skills 和工具，以及 host 如何安全地掛載和卸載它。

Agent Roles 不替代 skills 或 plugins。它把它們組織成完整、可攜的 roles。

## 什麼是 RolePack

RolePack 是一個面向專業 agent role 的可攜包。

一個 RolePack 可以包含：

- role 身分和職責
- role 記憶
- skills
- prompts 和模板
- 工具腳本和工具文件
- role 自帶的 plugin 內容
- MCP 設定或範例
- host 適配元資料
- 驗證和相容性測試

這裡的 plugin 內容指 role 包內部攜帶的 host 原生 plugin 檔案，不表示必須安裝
全域 plugin，也不表示需要外部 plugin manager。

## 專案範圍

Agent Roles 首先是一個規範專案。前期版本聚焦於 RolePack 包目錄結構、role
元資料約定、驗證規則、禁止攜帶 secret 和 runtime state 的規則、reference
roles、templates、host adapter contracts 和 conformance tests。

Runtime management 會在 RolePack 規範穩定後推進。
