# CCB Hotfix · Four-Part Fidelity Brief

- **Status**: v0.3.2 hotfix
- **Date**: 2026-04-22
- **Scope**: consult brief construction and `consult_codex` input fidelity
- **Authority**: hotfix rule; does not replace `primitive-executor-contract.md`

---

## 1. Purpose

Prevent consult drift caused by sending Codex a processed summary instead of the user's original wording. Every consult brief must preserve raw user input and separate fact, interpretation, ambiguity, and transformation.

## 2. Required Four Sections

| Section | Required content | Rule |
|---|---|---|
| `user_verbatim` | exact user wording, including typos and uncertainty | never paraphrase as the only input |
| `claude_interpretation` | Claude's structured read of the user wording | label as interpretation, not fact |
| `ambiguities` | unresolved terms, typos, scope uncertainty, missing facts | do not silently resolve |
| `fidelity_diff` | added / omitted / drifted meaning compared with prior brief or source | mandatory after any processed summary |

## 3. Template

```yaml
user_verbatim:
  - "<exact quote>"
claude_interpretation:
  facts:
  assumptions:
  decisions_made_by_claude:
ambiguities:
  - term:
    possible_readings:
    blocking: true|false
fidelity_diff:
  added:
  omitted:
  drift:
```

## 4. Filling Rules

| Rule | Requirement |
|---|---|
| Preserve Chinese/English mix | keep the user's original language in quotes |
| Preserve typo markers | mark likely typo only in `ambiguities` |
| Separate facts from decisions | Claude-made decisions must be explicit |
| No hidden expansion | new concepts must be marked as inference |
| Brief reuse | if a prior brief is reused, include what changed |

## 5. Relation To `consult_codex`

| Primitive stage | Fidelity requirement |
|---|---|
| before `consult_codex` call | four sections must exist |
| during consult | Codex must challenge `claude_interpretation` against `user_verbatim` |
| after consult | findings must cite whether they rely on verbatim text or interpretation |
| follow-up consult | include `fidelity_diff` from previous round |

## 6. Enforcement

| Failure | Required handling |
|---|---|
| no `user_verbatim` | block consult dispatch |
| no `ambiguities` section | block unless explicitly `none` |
| interpretation presented as user fact | rewrite brief before consult |
| user corrects meaning | produce fidelity correction round before design/spec |

## Provenance

Derived from 2026-04-22 CCB consult R1-b and R5. R1 used a Claude-processed northstar summary instead of direct user wording; R1-b corrected the fidelity gap.
