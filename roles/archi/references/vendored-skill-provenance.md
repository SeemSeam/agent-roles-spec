# Vendored Skill Provenance

Access date: 2026-06-17.

This file records public/open-source skills carried by `agentroles.archi`.
Vendored skills are reviewable Role source. They must not include secrets,
provider sessions, generated projection output, package caches, or hidden
installer state.

## Blueprint Gate

- Role id: `agentroles.archi`
- Shape decision: `single_role`
- Publication target: `roles/archi` and `reference_roles/archi`
- Permission posture: read-only role runtime; no required network or secrets
- Write scope: active `archi` Role source, reference Role mirror, and focused
  tests only
- Stop conditions: unknown license, incompatible license, hidden runtime state,
  required credentials, or source behavior that cannot be represented as
  reviewable Role source

## Vendored Sources

| Role path | Source | Ref | License | Treatment | Notes |
| --- | --- | --- | --- | --- | --- |
| `skills/vendor/code-review-and-quality/` | `addyosmani/agent-skills` `skills/code-review-and-quality` | `a5f0b176381e9fea24a61aefc243506686aa2435` | MIT | `vendored_intact` | Multi-axis code review skill covering correctness, readability, architecture, security, and performance. |
| `skills/vendor/improve-codebase-architecture/` | `mattpocock/skills` `skills/engineering/improve-codebase-architecture` | `694fa30311e02c2639942308513555e61ee84a6f` | MIT | `vendored_modified` | Architecture deepening workflow retained; browser/CDN report generation and project-file side effects removed to fit archi read-only boundaries. |
| `skills/vendor/requesting-code-review/` | `obra/superpowers` `skills/requesting-code-review` | `b62616fc12f6a007c6fd5118146821d748da0d33` | MIT | `vendored_intact` | Review-lane skill and reviewer prompt template for independent code review handoff. |
| `skills/vendor/receiving-code-review/` | `obra/superpowers` `skills/receiving-code-review` | `b62616fc12f6a007c6fd5118146821d748da0d33` | MIT | `vendored_intact` | Feedback triage skill for verifying review comments before accepting or rejecting them. |

Each vendored directory carries a copy of the upstream license file.

## Candidate Scorecard

| Candidate | Status | Fit | Decision |
| --- | --- | --- | --- |
| `addyosmani/agent-skills` code-review-and-quality | selected | high | Strong general review checklist; carry intact and let archi memory keep release approval advisory. |
| `mattpocock/skills` improve-codebase-architecture | selected | high | Best focused architecture skill; modify side-effecting output path for Role boundary compatibility. |
| `obra/superpowers` requesting/receiving-code-review | selected | medium-high | Useful review-lane workflow; carry intact because it is compact and license-cleared. |
| `awesome-skills/code-review-skill` | referenced only | medium | Useful broad language guide, but too large and tool-permission heavy for archi default projection. |
| `getsentry/skills` code-review | referenced only | low-medium | Good maintained example, but too Sentry-specific for a general architecture Role. |

## Exclusions

- `.git/`, workflows, plugin manifests, marketplace metadata, package manager
  files, generated pages, and unrelated skills were excluded.
- `awesome-skills/code-review-skill` language references and scripts were not
  copied in this pass because they would dominate the Role package and add Bash
  or WebFetch expectations.
- Sentry-specific review guidance was not copied because the Role should remain
  project-neutral.

## Update Policy

To update a vendored skill:

1. Inspect the upstream source and license at a concrete ref.
2. Re-run source inventory and candidate scoring.
3. Update the copied files and this provenance table together.
4. Preserve license notices.
5. Re-run archi role tests and full repository tests.
