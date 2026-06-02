# Decision 002: RolePacks May Contain Plugin Content

Date: 2026-06-02

## Context

Claude Code, Codex, and other hosts have native plugin or capability-package
surfaces. The public story should not frame plugins as export targets or as
the root abstraction. The user's intended model is simpler: a concrete role can
carry plugin content inside its package.

## Decision

Concrete RolePack directories may include plugin content as part of the role.

The core README and spec should describe plugin content as one type of role
content alongside memory, skills, prompts, tools, MCP configuration, adapter
metadata, and tests.

## Consequences

- The project can say users move from scattered skills/plugins to managed
  roles.
- The first spec does not need a plugin dependency resolver.
- Host adapters decide how role-contained plugin content maps to host-native
  plugin or capability surfaces.
- The README should avoid saying "Claude plugin export" or "Codex plugin
  export" as the primary model.
