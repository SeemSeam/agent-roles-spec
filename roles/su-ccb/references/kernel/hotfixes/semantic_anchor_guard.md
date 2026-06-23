# CCB Hotfix · Semantic Anchor Guard

- **Status**: v0.3.2 hotfix
- **Date**: 2026-04-22
- **Scope**: prevent requirement expansion beyond user semantic anchors
- **Authority**: hotfix rule; does not replace `registries/guard-registry.md`

---

## 1. Purpose

Prevent product-identity drift where words like "reference" or "borrow ideas" are expanded into integration, runtime adoption, adapter work, or dependency decisions.

## 2. Anchor Terms

| Anchor | Default lock |
|---|---|
| `参考` | reference only |
| `借鉴` | concept/structure/pattern study only |
| `对标` | comparison only |
| `inspiration` | reference only |
| `learn from` | reference only |
| `similar products` | research set only |

## 3. Forbidden Expansions

When a reference-only anchor is active, the following are forbidden unless the user explicitly reauthorizes them:

| Forbidden expansion | Meaning |
|---|---|
| `integrate` | connect product/runtime/API into CCB |
| `fork` | copy product code into CCB |
| `depend` | add package/runtime dependency |
| `adapter` | build bridge/client/wrapper |
| `runtime adoption` | use external product as execution engine |
| `overlay` | place CCB governance on external runtime |
| `direct DB coupling` | read/write external product database |

## 4. Required Brief Field

```yaml
semantic_anchor:
  verbatim: "参考/借鉴"
  allowed_scope: concept / structure / pattern study only
  forbidden_expansions:
    - integrate
    - fork
    - depend
    - adapter
    - runtime adoption
    - overlay
    - direct DB coupling
  expansion_risk: pass|fail
```

## 5. Trigger Points

| Trigger | Required action |
|---|---|
| User uses anchor words | create `semantic_anchor` block |
| Claude writes consult brief | mark any expansion beyond anchor as risk |
| Claude proposes options | exclude forbidden expansions unless explicitly reauthorized |
| Codex consult receives brief | independently challenge premise drift |

## 6. Decision Rule

| Case | Behavior |
|---|---|
| User says "参考/借鉴" | reference-only lock |
| Brief suggests integration | mark `expansion_risk=fail` and revise |
| Local copy of a product exists | use as research material only |
| User explicitly says "接入/对接/采用" | new authorization required; record exact quote |

## 7. Violation Example

| Drift | Correction |
|---|---|
| "参考 vibeman" → "integrate Vibeman runtime adapter" | "Study Vibeman schema/UX as reference; CCB self-builds engine" |

## Provenance

Derived from 2026-04-22 CCB consult R4/R5. User explicitly corrected that vibeman "不应该是我们的一部分或者对接对象".
