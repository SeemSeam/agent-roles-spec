---
name: role-research
description: Plan and run evidence-backed research before designing an Agent Role; use for broad role ideas, skill/tool discovery, source discovery, maintained example comparison, and research briefs that must cite inspected sources before Role source is written.
---

# Role Research

Use this skill when a Role request needs discovery before design: broad domain
requests, current skill/tool research, external source search, maintained
example comparison, or deciding whether a role idea is feasible.

## Inputs

- User request, target domain, intended users, and non-goals.
- Target host adapters and publication target when known.
- Allowed research surfaces: local repository, public web, package registries,
  official docs, maintained examples, or user-provided source trees.
- User priorities such as speed, stability, license safety, host fit,
  novelty, or local-only use.

## Workflow

1. Produce a research brief before discovery.
   - Define the role question, intended outputs, non-goals, target hosts,
     expected Role shape, and minimum evidence needed.
   - Use `templates/research-brief.md` when a persisted artifact is useful.
2. Search local sources first.
   - Check Agent Roles specs, templates, aliases, existing Roles, tests, and
     nearby plan-tree notes.
3. Use bounded public web research only when it materially improves design.
   - Prefer official docs, open standards, package metadata, release notes,
     maintained examples, and tests.
   - Do not inspect private data, secrets, provider sessions, browser profiles,
     or paywalled/private docs.
4. Record research evidence.
   - For each design-changing source, capture locator, access date, authority,
     inspected files/pages, extracted facts, confidence, and design impact.
   - Never cite a source that was not opened, inspected, or present in local
     evidence.
   - Use `schemas/research-evidence.schema.json` for machine-checkable
     research evidence when the task is substantial.
5. Produce a candidate list.
   - Label each source as `official`, `maintained`, `community`, `stale`, or
     `unknown`.
   - Mark obvious rejects early, especially license-unclear copied content,
     secret/runtime-state risk, poor host fit, or weak testability.

## Output

Return:

1. research brief;
2. inspected source list with access dates;
3. evidence notes with confidence labels;
4. candidate list and early reject reasons;
5. whether the next step is `role-candidate-score`, `role-source-ingest`, or
   `role-blueprint`.
