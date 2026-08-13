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
  tool-independent evidence selection, focused topology, boundary, fitness,
  decision-drift, change-impact, and distributed-reliability methods, optional
  Architec/Hippo and project-native checks, vendored public code-review skills,
  prompts, evaluation suite, plugin content, and CCB adapter metadata.
- [ccb-self](ccb-self/) (`agentroles.ccb_self`, `preview`): CCB runtime
  maintenance and expert-reference role with bounded self-diagnosis, recovery,
  config, message-chain, source/manual, command, release, and test-evidence
  skills, plus dynamic workflow orchestration for analysis, execution, review,
  mounted-agent memory overlays, dispatch, and guarded refresh.
- [ccb-frontdesk](ccb-frontdesk/) (`agentroles.ccb_frontdesk`,
  `experimental`): user-facing workflow boundary for macro intake,
  broker-curated clarification display, final summaries, and escalation
  reporting without implementation or runtime orchestration authority.
- [ccb-planner](ccb-planner/) (`agentroles.ccb_planner`, `experimental`):
  phase-activated CCB workflow planner that emits task packet, readiness, and
  candidate-question artifacts for script import and review gates.
- [ccb-clarification-broker](ccb-clarification-broker/)
  (`agentroles.ccb_clarification_broker`, `experimental`): fresh-context
  question broker that compresses planner candidate questions into
  frontdesk-facing batches and normalizes user answers back to planner.
- [ccb-plan-reviewer](ccb-plan-reviewer/)
  (`agentroles.ccb_plan_reviewer`, `experimental`): semantic readiness review
  gate for planner artifacts, acceptance criteria, verification contracts,
  risk handling, and clarification blockers.
- [ccb-worker](ccb-worker/) (`agentroles.ccb_worker`, `experimental`):
  short-lived bounded execution role for one work item with explicit evidence
  and no global completion authority.
- [ccb-checker](ccb-checker/) (`agentroles.ccb_checker`, `experimental`):
  node-level checker for worker output, missing evidence, fallback,
  degradation, and scope shrinkage.
- [ccb-round-checker](ccb-round-checker/)
  (`agentroles.ccb_round_checker`, `experimental`): whole-round verifier that
  produces a machine-readable round result for CCB script import.
- [coder](coder/) (`agentroles.coder`, `experimental`): focused
  implementation role for small, repo-native, test-backed code changes with
  context scanning, minimal implementation, bug-fix proof, fallback discipline,
  large-file control, repository style following, source checks, CI-failure
  fixes, safe dependency gates, reusable coding templates, and explicit
  escalation boundaries for review, architecture, frontend, mobile, security,
  release, and Role-spec work.
- [code-reviewer](code-reviewer/) (`agentroles.code_reviewer`,
  `experimental`): bounded review-gate role for checking worker output against
  task intent, test evidence, fallback discipline, and implementation
  boundaries without taking over implementation.
- [ccb-orchestrator](ccb-orchestrator/) (`agentroles.ccb_orchestrator`,
  `experimental`): CCB loop dispatcher role for requesting configured dynamic
  capacity, sending bounded worker/reviewer asks, aggregating loop evidence,
  and releasing loop-owned idle capacity through CCB-owned commands.
- [frontend-engineer](frontend-engineer/) (`agentroles.frontend_engineer`,
  `experimental`): frontend design engineering role with focused skills for
  briefs, visual direction, design tokens, component composition,
  Figma-to-code, responsive accessibility, browser quality, optional AGY
  delegation, provider-shared runtime setup checks, project binding guidance,
  demo knowledge-base curation, and optional role-scoped MCP/tool manifest
  declarations for compatible Host Adapters, plus vendored UI/UX Pro Max
  design intelligence.
- [mobile-app-engineer](mobile-app-engineer/) (`agentroles.mobile_app_engineer`,
  `experimental`): mobile app engineering role for iOS, Android, React Native,
  Expo, Flutter, SwiftUI, and Jetpack Compose with mobile UX, platform stack
  guidance, component and asset-library curation, vendored UI/UX Pro Max
  design intelligence, virtual-device lab setup/control, device QA,
  performance, and store-readiness skills.
- [mother](mother/) (`agentroles.mother`, `preview`): Role creation, research,
  candidate scoring, blueprinting, external source ingestion, and audit role
  for spec compliance, catalog readiness, source-boundary checks,
  vendored public/open-source skill copy-treatment decisions,
  evidence-backed skill construction research, artifact templates, preview
  schemas, inventory evidence, blueprint gates, and optimization findings.
- [su-ccb](su-ccb/) (`agentroles.su_ccb`, `preview`): SU-CCB workflow role
  packaging Claude-side coordinator skills, Codex-side executor skills,
  runtime helpers, kernel references, templates, plugin metadata, and host
  adapter notes.
