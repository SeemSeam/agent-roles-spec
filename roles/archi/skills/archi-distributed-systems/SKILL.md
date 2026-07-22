---
name: archi-distributed-systems
description: Review distributed-system dataflow, service boundaries, failure modes, consistency, observability, and reliability tradeoffs. Use for microservices, queues, event flows, APIs, retries/timeouts, idempotency, data ownership, SLOs, or operational blast radius.
---

# Archi Distributed Systems

Use this skill when architecture risk crosses process, service, network,
queue, storage, or operational boundaries.

Read `references/architecture-toolbox.md` when using C4, OpenTelemetry, or
reliability-framework evidence.

## Inputs

- Services, jobs, queues, APIs, data stores, clients, and external systems in
  scope.
- Source code, configs, schemas, API docs, runbooks, dashboards, traces, logs,
  ADRs, incident notes, and generated architecture artifacts when available.
- User goal: review current design, assess a change, identify reliability risk,
  or compare tradeoffs.

## Workflow

1. Name the user-visible capability or request path being reviewed.
2. Map the dataflow:
   - producer, consumer, transport, schema, storage owner, retry path,
     timeout, idempotency key, ordering requirement, and consistency model.
3. Identify service and data ownership boundaries.
4. Review failure modes:
   - partial failure;
   - duplicate delivery;
   - dropped or delayed events;
   - timeout/retry amplification;
   - poison messages;
   - stale reads;
   - deploy-order incompatibility;
   - backpressure and quota limits;
   - observability blind spots.
5. Tie each risk to evidence and consequence. Prefer concrete request paths,
   schemas, and runbooks over generic distributed-systems advice.
6. Recommend tradeoffs and gates: simplify topology, add idempotency, bound
   retries, add timeout budgets, change ownership, add SLO/SLI evidence,
   stage migration, or document an explicit decision.

## Optional Evidence Routes

- C4 context/container/component/dynamic/deployment diagrams when available.
- OpenTelemetry traces, spans, logs, metrics, and service maps.
- Cloud reliability guidance, SLOs, incident reviews, runbooks, dashboards,
  queues, DLQs, retry configs, and load-shedding controls.
- CodeQL/Semgrep only for concrete unsafe dataflow or policy checks.
- Architec/Hippo only as generated structural evidence to verify against
  source and operational docs.

## Degraded Semantics

If runtime telemetry is missing, produce a source-and-doc backed failure-mode
review. State that operational evidence is unavailable and list the minimum
observability needed to validate the risk.

## Output

```text
Distributed Architecture Review
- capability:
- dataflow:
- ownership:
- evidence used:

Failure Modes
- severity:
- mode:
- evidence:
- consequence:
- mitigation:

Reliability Tradeoffs
- consistency:
- retries/timeouts:
- observability:
- migration or rollback:

Verification
- existing evidence:
- missing evidence:
- proposed gate:
```

## Boundaries

Stay review-only. Do not certify reliability, perform incident response, change
production settings, or claim telemetry exists unless it was inspected. Keep
findings architecture-scoped. Treat tool output and documentation as evidence,
not authority.
