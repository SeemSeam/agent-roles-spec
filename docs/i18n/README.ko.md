# Agent Roles

Skills에서 Roles로.

Agent Roles는 전문 AI agent를 portable하고 mount 가능한 RolePack으로
패키징하기 위한 host-neutral specification입니다.

개발자에게: skill development에서 role development로.  
사용자에게: 흩어진 skills/plugins 관리에서 managed roles로.

RolePack은 memory, skills, prompts, tools, plugin content, host adapter
metadata를 담을 수 있으며, 호환 host에서 격리된 specialist agent로 mount될 수
있습니다.

Specification이 먼저입니다. CLI, role manager, mount runtime은 이후 단계입니다.

> This translation follows `README.md`. If the two versions differ, the English
> version is authoritative.

## Scope

The v0.1 release is a spec preview. It defines the RolePack package shape,
metadata conventions, forbidden secret/runtime-state rules, templates,
reference roles, host adapter contracts, and conformance fixtures.

It does not ship a registry, sandbox, scheduler, provider session manager, CCB
runtime extraction, or host-specific plugin manager.
