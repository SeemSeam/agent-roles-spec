# Agent Roles

> Agent Roles は、専門 AI agent を portable で mount 可能な Role としてパッケージ化するための host-neutral 規範です。

Role は専門 agent に必要な skills、memory、tool 依存関係、plugin content、host adapter metadata を単一の portable なユニットにまとめます。対象プロジェクトの agent に mount して使用し、不要になったらクリーンに unmount できます。メイン環境、ユーザーのグローバル設定、他の agent に影響を与えません。

この規範はマルチ agent 協働をより明確な構造へ推進することを目指しています：

| 対象 | 変化 |
|------|------|
| **開発者** | 離散した skill の開発から完全な Role の開発へ |
| **ユーザー** | skills/plugins の分散管理から roles の統一管理へ |

> This translation follows `README.md`. If the two versions differ, the English version is authoritative.

---

## なぜ Agent Roles が必要か

専門 agent のコンテンツは通常、複数のディレクトリ、設定ファイル、runtime に散在しています：

- システムプロンプト
- オンデマンドで取得する skills
- プロジェクト memory と長期 memory
- ツール依存関係
- 各 host 環境のアダプター設定

移行時には手動でコピー、インストール、デバッグが必要です。アンマウント時には、どのコンテンツが該当 agent のものか、メイン環境や他の agent のものかを判別するのが困難です。

Agent Roles はこれらを標準化された Role フォーマットに整理し、専門 agent を独立したユニットとして定義、配布、mount、unmount できるようにします。

---

## コア概念

### Role

Role は Agent Roles の中核オブジェクトで、完全な専門 agent を表します。単なるプロンプトでも skill のコレクションでもなく、自身の能力、コンテキスト、アダプター情報を持つ agent のカプセル化ユニットです。

### Role Definition

Role Definition は Role のマニフェストファイルです。Role の職責、必要な skills、ツール依存関係、plugin content、host アダプター設定、および mount・unmount 時の処理ルールを記述します。

### Host Adapter

Host Adapter は Role がどのように特定の host 環境に入るかを記述します。同一の Role を複数の host が読み込んで mount できます。Host Adapter は各 host のディレクトリ構造、設定フォーマット、ツールエントリーポイント、plugin 投影方式の違いを表現します。

### Mount / Unmount

| 操作 | 説明 |
|------|------|
| **Mount** | Role を対象プロジェクトに mount し、インデックス経由でコンテンツを動的にロード、Role と対象プロジェクト・host 環境の接続を確立する |
| **Unmount** | Role を対象プロジェクトから unmount する。session ファイルは必要に応じて保持し、その他のコンテンツは即時クリア。メイン環境、ユーザーのグローバル設定、他の agent に影響しない |

---

## Role が携帯できるもの

| コンテンツ | 説明 |
|-----------|------|
| `role instructions` | 役割の職責、行動の境界、作業スタイル |
| `skills` | role が使用する能力モジュール |
| `memory` | role が携帯する memory またはプロジェクトコンテキスト |
| `tools` | role が依存するコマンド、スクリプト、外部ツール |
| `plugins` | role が host 環境に投影する plugin content |
| `host adapters` | 各 host 環境向けのアダプターメタデータ |
| `lifecycle rules` | mount、更新、unmount 時の処理ルール |

---

## 設計目標

- 専門 agent の役割を明確に定義し独立して配布できる
- Role はプロジェクト間で移行でき、オンデマンドで mount し、クリーンに unmount できる
- Role のコンテンツ境界が明確で、メイン環境や他の agent を干渉しない
- CLI、role manager、mount runtime に統一規範を提供する

---

## 公開済み Roles

現在 catalog で公開されている Roles です。各エントリは `agent-roles` で
install でき、host 固有の adapter を提供できます。

<details>
<summary><strong>agentroles.archi</strong> - Architecture Reviewer</summary>

- **Version**: `0.2.3`
- **レベル**: `stable`
- **Purpose**: アーキテクチャの drift、境界、結合度、保守性、構造的リスクをレビューします。
- **Best for**: アーキテクチャレビュー、依存関係境界の確認、結合度分析、実践的な次ステップの整理。
- **Contents**: Role instructions、アーキテクチャレビュー skills、再利用可能な prompt、tool documentation、plugin content、host adapters。
- **Adapters**: CCB, Claude Code, Codex, HIVE.
- **Install**: `agent-roles install archi`
- **Update**: `agent-roles update archi`
- **Source**: [`roles/archi`](../../roles/archi/)

</details>

---

## 現在の状況

> 規範はまだ初期設計段階にあります。

現在の重点：

- Role の概念境界と Role Definition の構造
- skills、memory、tools、plugins の整理方法
- Host Adapter の表現方法
- mount / unmount の最小行動制約

今後: schema、examples、CLI プロトタイプ、role manager、mount runtime を追加予定。

---

## アダプターロードマップ

Host Adapter の開発は以下のマルチ agent プロジェクトから優先的に開始します：

- [CCB (claude_codex_bridge)](https://github.com/SeemSeam/claude_codex_bridge)
- [HIVE](https://github.com/tt-a1i/hive)

Claude Code、Codex などの主要 host 向けアダプターも開発予定です。各プラットフォームでの Role フォーマットのネイティブサポートを積極的に推進していきます。
