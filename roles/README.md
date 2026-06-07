# Roles

This directory contains published Roles ready for use.

Roles here have passed the quality bar described in `CONTRIBUTING.md`. They
are intended for direct mounting, not just spec demonstration. Published Roles
should declare `[catalog] level = "stable"` or another explicit catalog level
in `role.toml` so `agent-roles list` can display their maturity.

## Difference from `reference_roles/`

| Directory | Purpose | Quality bar |
|-----------|---------|-------------|
| `reference_roles/` | Spec demonstration and teaching | Structure correctness |
| `roles/` | Production-ready, mountable Roles | Full content, tested, host-adapter notes |

## Contributor Path

1. Read `reference_roles/` to understand the expected structure.
2. Use a template from `templates/` to start your role.
3. Submit to `roles/` when the role is complete and tested.

## Current Roles

- [archi](archi/) (`agentroles.archi`, `stable`): architecture review role with memory,
  skills, prompts, plugin content, and CCB adapter metadata.
