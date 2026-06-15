# Single Frontend Engineer Role First

Date: 2026-06-14

## Context

The requested capability spans frontend design, implementation, accessibility,
performance, MCP tool use, browser validation, and optional Google Antigravity
CLI (`agy`) delegation. This could become multiple specialist Roles or a
multi-agent topology, but the first request is to plan one practical Role.

## Decision

Design one Role first: a frontend design engineer Role with focused skills and
tool references. Treat MCP servers and `agy` as optional runtime capabilities
or Project Binding concerns, not as separate Roles and not as required Role
source content.

## Consequences

- The first blueprint can stay understandable and installable as one catalog
  Role.
- The Role can support broad frontend work while still using focused skills for
  design, component composition, accessibility, browser QA, performance, and
  `agy` delegation.
- If the Role becomes too broad during validation, split candidates are:
  `agentroles.frontend_designer`, `agentroles.frontend_performance`, or a
  future frontend team/topology recipe.
- Runtime state, tool credentials, MCP client config, and `agy` worktrees remain
  outside Role source.
