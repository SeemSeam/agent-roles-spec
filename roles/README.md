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
- [ccb-self](ccb-self/) (`agentroles.ccb_self`, `preview`): CCB runtime
  maintenance and expert-reference role with bounded self-diagnosis, recovery,
  config, message-chain, source/manual, command, release, and test-evidence
  skills.
- [frontend-engineer](frontend-engineer/) (`agentroles.frontend_engineer`,
  `experimental`): frontend design engineering role with focused skills for
  briefs, visual direction, design tokens, component composition,
  Figma-to-code, responsive accessibility, browser quality, optional AGY
  delegation, provider-shared runtime setup checks, project binding guidance,
  demo knowledge-base curation, and optional role-scoped MCP/tool manifest
  declarations for compatible Host Adapters.
- [mother](mother/) (`agentroles.mother`, `preview`): Role creation, research,
  candidate scoring, blueprinting, external source ingestion, and audit role
  for spec compliance, catalog readiness, source-boundary checks,
  evidence-backed skill construction research, artifact templates, preview
  schemas, inventory evidence, blueprint gates, and optimization findings.
