# Frontend Engineer Role Plan

Date: 2026-06-14

## Purpose

Plan a high-quality Agent Role for an advanced frontend engineer who can design,
build, review, and validate production UI. The Role should combine visual design
judgment, design-system discipline, component implementation, accessibility,
performance, browser verification, MCP-enabled tool use, and optional Google
Antigravity CLI (`agy`) delegation.

This plan exists before Role source is written. It captures scope, evidence,
candidate capability areas, open questions, and blueprint gates for a future
`roles/<id>/` draft.

## Scope

In scope:

- Role identity, responsibilities, non-goals, permissions, and adapter posture.
- Frontend design and engineering skill map.
- MCP workflow plan for Figma, Storybook, Playwright, Chrome DevTools, shadcn,
  documentation lookup, and related frontend tools.
- `agy` integration as an optional delegated frontend implementation loop.
- Demo and knowledge-base curation rules.
- Validation prompts and readiness gates before catalog publication.

Out of scope for this planning phase:

- Creating `roles/<id>/` source files.
- Installing or configuring project-local MCP servers.
- Storing Figma files, browser profiles, provider sessions, credentials, or
  `agy` worktree state in Role source.
- Promising live mount/unmount behavior before Host Adapter contracts support
  it.

## Authority

1. Published Agent Roles specs, templates, and current catalog Roles.
2. This plan root for the frontend engineer Role design.
3. External frontend/MCP/AGY sources recorded in topic notes as advisory
   evidence.
4. Runtime MCP client configuration and project-specific binding remain outside
   Role source.

## File Map

- [roadmap.md](roadmap.md): phase plan from research to draft Role validation.
- [open-questions.md](open-questions.md): unresolved naming, scope, and
  publication questions.
- [topics/role-scope-and-blueprint-gate.md](topics/role-scope-and-blueprint-gate.md):
  Role identity draft, boundaries, contents map, permissions, and blueprint
  gate.
- [topics/role-definition-and-memory-design.md](topics/role-definition-and-memory-design.md):
  planned `role.toml` contract and `memory.md` durable instruction structure.
- [topics/frontend-skill-map.md](topics/frontend-skill-map.md): proposed
  focused skills and expected outputs.
- [topics/mcp-and-agy-integration.md](topics/mcp-and-agy-integration.md): MCP
  server roles, `agy` delegation model, and runtime boundary rules.
- [topics/demo-knowledge-base.md](topics/demo-knowledge-base.md): demo catalog
  and frontend knowledge-base policy.
- [topics/high-star-open-source-candidates.md](topics/high-star-open-source-candidates.md):
  reduced open-source source set, redundancy decisions, and blueprint
  provenance inputs.
- [decisions/001-single-role-first.md](decisions/001-single-role-first.md):
  decision to design one Role first, with optional delegated tools.

## Reading Path

Start with [roadmap.md](roadmap.md), then read
[topics/role-scope-and-blueprint-gate.md](topics/role-scope-and-blueprint-gate.md)
and
[topics/role-definition-and-memory-design.md](topics/role-definition-and-memory-design.md),
then [topics/mcp-and-agy-integration.md](topics/mcp-and-agy-integration.md).
Use
[topics/high-star-open-source-candidates.md](topics/high-star-open-source-candidates.md)
and [open-questions.md](open-questions.md) before writing Role source.

## Current Status

Status: Draft landed.

Landed draft: `roles/frontend-engineer/` with `agentroles.frontend_engineer`
metadata, memory, focused frontend skills, references, tool notes, adapters,
validation notes, aliases, README entries, and focused tests.

Next target: review the experimental Role for promotion readiness, including
behavior prompts, README/i18n sync policy, and whether additional adapter notes
are needed before catalog `preview`.
