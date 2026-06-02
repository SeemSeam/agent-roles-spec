# Contributing

Agent Roles welcomes role contributions, templates, adapter contract
feedback, and specification improvements.

## Where to Contribute

| Target | Use when |
|--------|----------|
| `roles/` | Role is complete, tested, and ready for mounting |
| `reference_roles/` | Role is a spec demonstration or teaching example |
| `templates/` | Providing a new starter scaffold |

## Role Contributions

A contributed role in `roles/` should include:

- clear purpose
- explicit responsibilities
- explicit non-goals
- useful memory, skills, tools, prompts, plugin content, or examples
- documented adapter notes when host-specific behavior is involved
- validation notes or tests where possible

## Forbidden Content

Do not include:

- credentials
- secrets
- API keys
- auth tokens
- provider sessions
- conversation logs
- runtime pid, socket, lifecycle, or completion authority files
- hidden installer behavior in memory or prompt text

Tool installation, update, and diagnostic behavior must be declared or
documented under the role's `tools/` directory.

## Specification Changes

Spec changes should preserve the project boundary:

- core Role semantics stay host-neutral
- CLI and runtime behavior follows the spec
- host-specific behavior belongs in adapter docs
- CCB, Claude Code, Codex, Hive, and future hosts should not redefine the core
  package format
