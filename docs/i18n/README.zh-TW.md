# 智能體角色規範

> Agent Roles 是面向專業 AI agent 的通用封裝規範，用於定義可移植、可按需裝卸的 Role。

一個 Role 將專業 agent 所需的 skills、記憶、工具依賴、plugin 內容和宿主適配元數據集中封裝，可掛載到目標專案的某個 agent 上，用完後乾淨卸載，不影響主環境、使用者全域配置和其他 agent 的工作狀態。

該規範旨在推動多 agent 協作向更清晰的結構演進：

| 角色 | 變化 |
|------|------|
| **開發者** | 從開發離散 skill 走向開發完整 Role |
| **使用者** | 從分散管理 skills/plugins 走向統一管理 roles |

語言：[简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [繁體中文](README.zh-TW.md) | [한국어](README.ko.md) | [更多](README.md)

> 本譯文跟隨 `README.md`。如果存在差異，以英文版本為準。

---

## 為什麼需要 Agent Roles

專業 agent 的內容通常分散在多個目錄、配置文件和 runtime 中：

- 系統提示詞
- 按需拉取的 skills
- 專案記憶與長期記憶
- 工具依賴
- 各宿主環境的適配配置

遷移時需要手動複製、安裝和調試；卸載時也難以區分哪些內容屬於該 agent、哪些屬於主環境或其他 agent。

Agent Roles 將這些內容組織為標準化的 Role 格式，使專業 agent 角色可以像獨立單元一樣被定義、分發、掛載和卸載。

---

## 核心概念

### Role

Role 是 Agent Roles 的核心物件，表示一個完整的專業 agent 角色。它不只是提示詞，也不只是 skill 集合，而是一個攜帶自身能力、上下文和適配資訊的 agent 封裝單元。

### Role Definition

Role Definition 是 Role 的定義文件，描述該 Role 的職責、所需 skills、工具依賴、plugin 內容、宿主適配方式，以及掛載和卸載時的處理規則。

### Host Adapter

Host Adapter 描述 Role 如何進入不同宿主環境。同一個 Role 可被多個宿主讀取和掛載，Host Adapter 負責表達各宿主在目錄結構、配置格式、工具入口和 plugin 投影方式上的差異。

### Mount / Unmount

| 操作 | 說明 |
|------|------|
| **Mount** | 將 Role 掛載到目標專案，通過索引方式動態加載所需內容，建立 Role 與目標專案、宿主環境之間的連接 |
| **Unmount** | 從目標專案卸載 Role，session 文件按需保留，其餘內容即時清除，不影響主環境、使用者全域配置和其他 agent 的狀態 |

---

## Role 可以攜帶什麼

| 內容 | 說明 |
|------|------|
| `role instructions` | 角色職責、行為邊界和工作方式 |
| `skills` | 角色需要使用的能力模組 |
| `memory` | 角色攜帶的記憶或專案上下文 |
| `tools` | 角色依賴的命令、腳本或外部工具 |
| `plugins` | 角色需要投影到宿主環境的 plugin 內容 |
| `host adapters` | 面向不同宿主環境的適配元數據 |
| `lifecycle rules` | 掛載、更新和卸載時的處理規則 |

---

## 設計目標

- 專業 agent 角色可被清晰定義和獨立分發
- Role 可在專案間遷移、按需掛載和乾淨卸載
- Role 的內容邊界明確，不干擾主環境和其他 agent
- 為 CLI、role manager 和 mount runtime 提供統一規範

---

## 當前狀態

> 規範仍處於早期設計階段。

當前重點：

- Role 的概念邊界與 Role Definition 結構
- skills、memory、tools、plugins 的組織方式
- Host Adapter 的表達方式
- mount / unmount 的最小行為約束

後續將補充 schema、examples、CLI 原型、role manager 和 mount runtime。

---

## 適配計劃

Host Adapter 的開發將率先面向以下多智能體專案展開：

- [CCB（claude_codex_bridge）](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

同時也將為 Claude Code、Codex 等主流 host 開發對應的 adapter，並積極推動各平台對 Role 格式的原生支持。
