---
name: role-source-ingest
description: Analyze external skill, plugin, prompt, tool, or workflow source before converting it into an Agent Role; produce inventory, source classification, provenance, split decision, blueprint gate, and validation plan before writing Role source.
metadata:
  short-description: Ingest external source for Role packaging
---

# Role Source Ingest

Use this skill when the user asks to make, import, package, wrap, or convert an
external repository, plugin, skill collection, prompt set, workflow system, or
local source tree into an Agent Role.

## Inputs

- Source URL or local path, plus ref, commit, tag, or access date when known.
- Intended Role id, aliases, host adapters, and publication target.
- User preference: one Role, multiple Roles, or ask `mother` to recommend.
- Whether web research is allowed for host-specific skill behavior.
- Candidate scorecard or research evidence when multiple sources were
  considered.

## Workflow

1. Establish source authority.
   - Record URL/path, ref, license, maintainer, package names, and access date.
   - If multiple candidate sources exist, run `role-candidate-score` before
     selecting a source for ingestion.
   - Do not fetch private data, read secrets, install plugins, or mutate
     provider homes.
2. Inventory before writing.
   - Prefer the local helper:

     ```bash
     python roles/mother/scripts/inventory_external_source.py <source-path> --pretty
     ```

   - If the source is remote, inspect a local clone or checkout; do not write
     into `roles/<id>/` during inventory.
3. Classify content.
   - Role memory: durable identity, boundaries, and operating instructions.
   - Role skills: focused reusable workflows with trigger metadata.
   - Role references: long domain rules, schemas, examples, and contracts.
   - Tool/runtime support: scripts, libraries, validators, runbooks, templates.
   - Plugin content: host-native manifests or plugin source carried as Role
     source.
   - Adapter notes: host-specific projection, unsupported behavior, cleanup,
     and Project Binding details.
   - Excluded content: secrets, sessions, task progress, runtime state,
     provider homes, generated projection output, build caches, vendored
     dependency trees, and hidden installed-state records.
4. Decide packaging shape.
   - Use one Role when one specialist identity owns the workflow.
   - Recommend multiple Roles only when duties require different memory,
     permissions, providers, or independent lifecycle contracts.
   - Recommend a future team/topology recipe when the desired behavior is an
     agent network rather than one Role identity.
   - If the user requires one Role, document surfaces and degraded partial
     mounts instead of pretending every host can project everything.
5. Produce the blueprint gate before edits.
   - Prefer `templates/role-blueprint.md`; use
     `schemas/role-blueprint.schema.json` when the blueprint should be
     machine-checkable.
   - Role id, aliases, catalog level, version posture, and publication target.
   - Contents map from source paths to Role paths.
   - Permission posture and network/write/secrets rationale.
   - Adapter surface map and unsupported-content behavior.
   - Provenance, license, source refs, and copied-versus-synthesized content.
   - Validation plan for TOML, contents paths, aliases, list/install/resolve,
     source-boundary scan, and tool smoke tests where useful.
   - Risks and user confirmation points.
6. Write only after the blueprint is accepted or the user explicitly instructs
   implementation with that blueprint.

## Write Gate

Do not create or modify `roles/<id>/` before the blueprint exists. If writing
starts, finish in one of these states:

- `complete`: required metadata, README, memory, contents inventory, tests, and
  validation are present.
- `draft`: the source is explicitly incomplete and remaining gaps are listed.
- `rollback`: partial files were removed with user consent.
- `blocked`: the blocker and dirty paths are listed.

## Output

Return:

1. inventory summary and notable risks;
2. source classification table;
3. single-role/multi-role/topology decision;
4. blueprint gate;
5. proposed patch plan;
6. verification commands.
