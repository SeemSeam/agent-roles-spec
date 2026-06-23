# CCB Hotfix · Decision Escalation Guard

- **Status**: v0.3.2 hotfix
- **Date**: 2026-04-22
- **Scope**: Claude decision escalation before asking user for approval/choice
- **Authority**: hotfix rule; does not replace `registries/guard-registry.md`

---

## 1. Purpose

Prevent "can decide but asks user anyway" failures. Claude must make reversible, low-risk decisions when evidence is sufficient, and only escalate decisions that genuinely require user authority.

## 2. Required Decision Record

Before `ask_user_decision` or high-impact `ask_user_approval`, Claude must fill:

| Field | Required | Meaning |
|---|---|---|
| `decision_class` | yes | `implementation_detail` / `product_direction` / `architecture_boundary` / `data_contract` / `security_or_permission` / `irreversible_operation` |
| `reversibility` | yes | `reversible` / `costly_reversible` / `irreversible` |
| `risk_level` | yes | `low` / `medium` / `high` |
| `available_evidence` | yes | concrete files, docs, consult findings, or runtime facts |
| `why_user_decision_is_required` | yes | specific reason user authority is needed; `unclear` is not enough |
| `default_decision_if_not_escalated` | yes | action Claude would take if not escalating |

## 3. Decision Rule

| Condition | Required behavior |
|---|---|
| `risk_level=low` AND `reversibility=reversible` AND evidence sufficient | Claude decides, logs rationale, continues |
| `decision_class=implementation_detail` AND follows existing pattern | Claude decides |
| `decision_class=product_direction` OR `architecture_boundary` | consult first; user only if consult leaves unresolved conflict |
| `decision_class=data_contract` OR `security_or_permission` | user decision allowed when impact is high or irreversible |
| `reversibility=irreversible` | user decision or explicit accepted ADR required |

## 4. Trigger Points

| Trigger | Check |
|---|---|
| Before `ask_user_decision` | run the 6-field record |
| Before `ask_user_approval` | run if approval changes product, architecture, schema, permission, or irreversible state |
| Before consult brief handoff | state whether Claude already made all reversible decisions |
| Before dispatch to Codex | ensure open decision items are real blockers, not avoidable deferrals |

## 5. Violation Examples

| Violation | Correct behavior |
|---|---|
| Asking user to choose between two equivalent file names | Pick the existing naming convention |
| Asking user whether to add a catalog entry required by spec | Add it |
| Asking user to approve a reversible wording fix | Fix and log |
| Asking user to choose a product identity change | Escalate with evidence |

## 6. Output Contract

If escalation happens, the brief must include:

```yaml
decision_escalation:
  decision_class:
  reversibility:
  risk_level:
  available_evidence:
  why_user_decision_is_required:
  default_decision_if_not_escalated:
```

## Provenance

Derived from 2026-04-22 CCB consult R2/R3/R4/R5, especially the repeated real-run issue where Claude deferred decisions that were reversible and evidence-backed.
