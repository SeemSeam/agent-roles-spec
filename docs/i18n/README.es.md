# Agent Roles

De skills a roles.

Agent Roles es una especificación host-neutral para empaquetar agentes de IA
especializados como RolePacks portables y montables.

Para desarrolladores: pasar del desarrollo de skills al desarrollo de roles.  
Para usuarios: pasar de gestionar skills/plugins dispersos a gestionar roles.

Un RolePack puede llevar memory, skills, prompts, tools, plugin content y host
adapter metadata, y después montarse en un host compatible como un agente
especializado aislado.

La especificación va primero. El CLI, el role manager y el mount runtime vienen
después.

> This translation follows `README.md`. If the two versions differ, the English
> version is authoritative.

## Scope

The v0.1 release is a spec preview. It defines the RolePack package shape,
metadata conventions, forbidden secret/runtime-state rules, templates,
reference roles, host adapter contracts, and conformance fixtures.

It does not ship a registry, sandbox, scheduler, provider session manager, CCB
runtime extraction, or host-specific plugin manager.
