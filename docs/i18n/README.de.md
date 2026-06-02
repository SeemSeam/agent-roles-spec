# Agent Roles

Von skills zu roles.

Agent Roles ist eine host-neutral specification, um spezialisierte AI agents
als portable und mountbare RolePacks zu paketieren.

Fuer Entwickler: von skill development zu role development.  
Fuer Nutzer: von verstreuter skills/plugins-Verwaltung zu managed roles.

Ein RolePack kann memory, skills, prompts, tools, plugin content und host
adapter metadata tragen und dann in einem kompatiblen host als isolierter
specialist agent gemountet werden.

Die Spezifikation kommt zuerst. CLI, role manager und mount runtime folgen
danach.

> This translation follows `README.md`. If the two versions differ, the English
> version is authoritative.

## Scope

The v0.1 release is a spec preview. It defines the RolePack package shape,
metadata conventions, forbidden secret/runtime-state rules, templates,
reference roles, host adapter contracts, and conformance fixtures.

It does not ship a registry, sandbox, scheduler, provider session manager, CCB
runtime extraction, or host-specific plugin manager.
