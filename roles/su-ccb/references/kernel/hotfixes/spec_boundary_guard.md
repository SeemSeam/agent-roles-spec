# CCB Hotfix · Spec Boundary Guard

- **Status**: v0.3.2 hotfix
- **Date**: 2026-04-22
- **Scope**: keep CCB dispatch specs at contract level
- **Authority**: hotfix rule; does not replace `registries/node-manifest-schema.yaml` or `registries/guard-registry.md`

---

## 1. Purpose

Prevent Claude-written dispatch specs from drifting into Codex implementation design. A spec is a dispatch contract: it should state the target behavior, inputs, hard constraints, non-goals, acceptance criteria, and receipt requirements.

## 2. Allowed Spec Content

| Section | Allowed content |
|---|---|
| Goal | what the slice must accomplish |
| Input contract | authoritative docs, code areas, and read-only references |
| Hard constraints | boundaries that Codex must not cross |
| Non-goals | explicitly excluded work |
| Behavioral acceptance | observable pass/fail behavior |
| Receipt requirements | compact execution summary fields |

## 3. Forbidden Spec Content

| Forbidden content | Why it is forbidden |
|---|---|
| Concrete command names | implementation detail belongs to Codex execution |
| Parameter names | risks freezing code/API choices too early |
| Rule IDs | lint/rule naming belongs to implementation |
| Internal file format | causes spec to become a low-level design |
| Section names | over-constrains docs/tests beyond behavior |
| YAML schema details | duplicates canonical/schema responsibilities |
| Test sample path contents | turns acceptance into fixture authoring |
| Output formatting internals | implementation can choose compatible format |
| Exit-code details | allowed only when behavior depends on it |
| Code line distribution | not a contract-level requirement |

## 4. Trigger Points

| Trigger | Required action |
|---|---|
| Claude starts drafting a dispatch spec | ask whether each item is behavior or implementation |
| Spec exceeds normal contract size | trim to dispatch contract unless context requires detail |
| Spec names command/rule/sample internals | move detail to design/task notes or leave to Codex |
| User flags "implementation details" | rewrite spec before dispatch |

## 5. Decision Rule

| Case | Behavior |
|---|---|
| Detail is required to preserve external contract | keep it |
| Detail only guides how Codex should implement | remove it |
| Detail constrains acceptance behavior | restate as behavior-level acceptance |
| Task is context-dependent | spec may exceed 50 lines, but remains skeletal |

## 6. Length Guidance

| Task type | Guidance |
|---|---|
| Simple slice | 20-50 lines |
| Medium slice | compact contract; avoid implementation sections |
| Context-dependent slice | may exceed 50 lines, but must remain dispatch-shaped |

## 7. Violation Example

| Drift | Correction |
|---|---|
| Spec lists lint rule IDs, command names, fixture file bodies, and output columns | Spec says "consult brief lint can pass/fail with specific rule identification" |

## Provenance

Derived from 2026-04-22 Slice 02 real-run. A 95-line r3 spec included lint rule IDs, command names, sample paths, and implementation details; the user flagged "你在干实施部分的事情", and the r4 rewrite was reduced to a 40-line pure dispatch contract.
