# Agent Roles

Des skills aux roles.

Agent Roles est une specification host-neutral pour empaqueter des agents IA
specialistes sous forme de RolePacks portables et montables.

Pour les developpeurs : passer du developpement de skills au developpement de
roles.  
Pour les utilisateurs : passer de la gestion de skills/plugins disperses a la
gestion de roles.

Un RolePack peut transporter memory, skills, prompts, tools, plugin content et
host adapter metadata, puis etre monte dans un host compatible comme agent
specialiste isole.

La specification vient d'abord. Le CLI, le role manager et le mount runtime
viennent ensuite.

> This translation follows `README.md`. If the two versions differ, the English
> version is authoritative.

## Scope

The v0.1 release is a spec preview. It defines the RolePack package shape,
metadata conventions, forbidden secret/runtime-state rules, templates,
reference roles, host adapter contracts, and conformance fixtures.

It does not ship a registry, sandbox, scheduler, provider session manager, CCB
runtime extraction, or host-specific plugin manager.
