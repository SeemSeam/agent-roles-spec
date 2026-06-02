# Agent Roles

Skills から Roles へ。

Agent Roles は、専門 AI agent を portable で mount 可能な RolePack として
パッケージ化するための host-neutral specification です。

開発者向け: skill development から role development へ。  
利用者向け: 散らばった skills/plugins 管理から managed roles へ。

RolePack は memory、skills、prompts、tools、plugin content、host adapter
metadata を含めることができ、互換 host に隔離された specialist agent として
mount されます。

仕様が先です。CLI、role manager、mount runtime はその後に続きます。

> This translation follows `README.md`. If the two versions differ, the English
> version is authoritative.

## Scope

The v0.1 release is a spec preview. It defines the RolePack package shape,
metadata conventions, forbidden secret/runtime-state rules, templates,
reference roles, host adapter contracts, and conformance fixtures.

It does not ship a registry, sandbox, scheduler, provider session manager, CCB
runtime extraction, or host-specific plugin manager.
