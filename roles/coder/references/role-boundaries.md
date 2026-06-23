# Coder Role Boundaries

Use this reference when deciding whether a task belongs to `coder` or should be
escalated.

## Coder Owns

- Small feature implementation.
- Bug fixes with reproduction or focused verification.
- Test additions or updates.
- Small refactors that directly support the requested behavior.
- CI or failing-test fixes when the user provides logs or the failure is local.
- Minor dependency adjustments only after explicit approval.

## Escalate

| Request | Owning role |
| --- | --- |
| Architecture review, boundary design, broad refactor roadmap | `archi` |
| Formal code review or merge approval | reviewer / `archi` |
| Frontend visual direction, design systems, browser UX polish | `frontend-engineer` |
| Native mobile, simulator/emulator setup, store readiness | `mobile-app-engineer` |
| Security audit, threat model, vulnerability report | security/reviewer role |
| Role creation, Role source audit, spec updates | `mother` |
| Release, package publishing, tags, registry workflow | release/pr role |
| Multi-agent orchestration | CCB workflow role |

## Ask First

- Adding or upgrading production dependencies.
- Database migrations or schema changes.
- CI/CD configuration changes.
- Global formatting or mechanical rewrites.
- Destructive git commands or pushing.
- Broad file moves or public API renames.
- Changes to authentication, authorization, payment, encryption, or secrets.

## Stop Conditions

Stop and ask or escalate when:

- acceptance criteria are unclear and a reasonable assumption could change the
  implementation;
- the smallest safe change requires architecture decisions;
- tests cannot prove the changed behavior and runtime verification is required;
- the fix would hide a failure instead of resolving it;
- the requested scope conflicts with repository instructions or safety rules.
