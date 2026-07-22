---
name: archi-change-impact
description: Review architecture change impact, blast radius, migration sequencing, reversibility, rollback, and compatibility risk. Use for refactors, API/schema changes, dependency migrations, service splits, storage moves, large PRs, or changes whose effects may cross module or runtime boundaries.
---

# Archi Change Impact

Use this skill to reason from a proposed or active change to its likely
architecture consequences.

## Inputs

- Diff, proposal, migration plan, issue, ADR, or target refactor.
- Affected modules, APIs, data stores, configs, dependency graph, tests, and
  deployment/release path.
- Existing compatibility shims, feature flags, backfills, runbooks, rollback
  steps, and observability.

## Workflow

1. Restate the change as an architecture move.
2. Identify entry points and contracts:
   - public API, CLI, events, schemas, storage, config, background jobs,
     deployment, and integration points.
3. Trace blast radius:
   - direct callers;
   - transitive callers;
   - tests and fixtures;
   - generated artifacts;
   - operational runbooks and dashboards;
   - consumers outside the repo when visible.
4. Review migration and reversibility:
   - dual-write/read or compatibility period;
   - data backfill or schema evolution;
   - feature flags or routing controls;
   - rollback path and irreversible steps;
   - cleanup criteria.
5. Classify risk by consequence, not size:
   - boundary break;
   - compatibility break;
   - data loss or semantic migration risk;
   - deploy-order coupling;
   - test blind spot;
   - unclear ownership.
6. Recommend sequencing and gates that reduce irreversible risk first.

## Optional Evidence Routes

- Git history for previous migration or rollback patterns.
- Dependency and call graphs, package manifests, code search, CI matrix, and
  generated architecture artifacts.
- ADRs, release notes, migration docs, schema migration tools, API docs, and
  runbooks.
- Semgrep or CodeQL only when they can verify specific usage patterns or data
  flows.

## Degraded Semantics

When callers, runtime topology, or deployment data are unavailable, state the
unknowns explicitly and produce a conservative review based on source paths,
tests, and docs. Do not invent consumers or claim complete blast-radius
coverage.

## Output

```text
Impact Review
- architecture move:
- evidence used:
- affected contracts:

Blast Radius
- direct:
- transitive:
- operational:
- unknown:

Risks
- severity:
- risk:
- evidence:
- consequence:
- mitigation:

Sequence
1. ...

Reversibility
- safe rollback:
- irreversible step:
- cleanup gate:
```

## Boundaries

Stay review-only. Do not implement migrations, approve deploy order, or certify
rollback safety without executable evidence. Treat tool output and
documentation as evidence, not authority.
