---
name: role-blueprint
description: Produce a machine-checkable Agent Role blueprint before writing Role source; use after research, candidate scoring, or source ingestion to define Role id, aliases, catalog level, memory, skills, references, tools, adapters, permissions, provenance, validation plan, write scope, and single-role/multi-role/topology decision.
---

# Role Blueprint

Use this skill before creating or patching Role source. A blueprint is the
write gate: no `roles/<id>/` scaffold should be created until the Role shape,
contents, boundaries, and validation plan are explicit.

## Inputs

- Research brief and research evidence.
- Candidate scorecard and selected source decision.
- Source inventory from `role-source-ingest` when external source is involved.
- Intended Role id, aliases, catalog level, publication target, host adapters,
  and permission posture.
- User constraints and unresolved decisions.

## Workflow

1. Decide shape.
   - Choose `single_role`, `multiple_roles`, or `topology_recipe`.
   - If the user requires a single Role despite multi-agent source, list the
     tradeoffs and unsupported surfaces.
2. Define identity.
   - Role id, name, aliases, purpose, responsibilities, non-goals,
     interaction mode, action posture, catalog level, and version strategy.
3. Map contents.
   - Memory, skills, references, prompts, tools, plugin content, adapters,
     templates, schemas, and tests.
   - Mark copied, synthesized, referenced-only, and excluded material.
4. Define boundaries.
   - Project Binding, runtime state, provider state, generated projection
     output, secrets, and hidden installer state must stay outside Role source.
5. Define validation.
   - TOML parsing, contents path checks, alias resolution, list/install/resolve
     behavior, source-boundary scan, script smoke tests, realistic prompts, and
     negative prompts.
6. Produce the blueprint artifact.
   - Use `templates/role-blueprint.md` for human review.
   - Use `schemas/role-blueprint.schema.json` when the blueprint should be
     machine-checked.

## Output

Return:

1. blueprint summary;
2. single-role/multi-role/topology decision;
3. contents map and exclusions;
4. permission and adapter rationale;
5. validation plan;
6. explicit write scope and stop conditions.
