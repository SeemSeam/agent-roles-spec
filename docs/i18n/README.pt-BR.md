# Agent Roles

De skills para roles.

Agent Roles e uma especificacao host-neutral para empacotar agentes de IA
especialistas como RolePacks portateis e montaveis.

Para desenvolvedores: sair do desenvolvimento de skills para o desenvolvimento
de roles.  
Para usuarios: sair do gerenciamento de skills/plugins espalhados para o
gerenciamento de roles.

Um RolePack pode carregar memory, skills, prompts, tools, plugin content e host
adapter metadata, e depois ser montado em um host compativel como um agente
especialista isolado.

A especificacao vem primeiro. CLI, role manager e mount runtime vem depois.

> This translation follows `README.md`. If the two versions differ, the English
> version is authoritative.

## Scope

The v0.1 release is a spec preview. It defines the RolePack package shape,
metadata conventions, forbidden secret/runtime-state rules, templates,
reference roles, host adapter contracts, and conformance fixtures.

It does not ship a registry, sandbox, scheduler, provider session manager, CCB
runtime extraction, or host-specific plugin manager.
