---
name: role-candidate-score
description: Score and filter candidate sources before turning them into Agent Roles; use after role research when comparing skills, plugins, repositories, tools, prompts, or workflow sources for relevance, authority, license, host fit, security, testability, and Role-shape fit.
---

# Role Candidate Score

Use this skill after research has produced candidate sources. Its job is to
make selection explicit before source ingestion, blueprinting, or scaffolding.

## Inputs

- Research brief and candidate list.
- Research evidence with source locators, access dates, inspected files/pages,
  authority labels, extracted facts, and confidence.
- User priorities: speed, stability, license safety, host fit, novelty,
  local-only use, or other constraints.
- Existing inventory output when a local source tree has already been
  inspected.

## Hard Gates

Reject or require a user decision before copying/adapting when any gate is hit:

- license is unknown or incompatible for copied content;
- source contains secrets, provider sessions, runtime state, or hidden install
  state;
- depended-on tooling has no maintainer signal;
- host fit is poor or adapter behavior would be misleading;
- testability is weak and cannot be made explicit;
- Role-shape fit is unclear: one Role, multiple Roles, or topology recipe.

## Scoring Dimensions

Score each candidate on a 0 to 3 scale:

- relevance to requested Role tasks;
- source authority and maintenance;
- license/provenance safety;
- Agent Roles host fit;
- runtime boundary cleanliness;
- dependency risk;
- security posture;
- testability;
- Role-shape fit.

Apply user-priority overrides explicitly instead of hiding them in prose.
Confidence must be `high`, `medium`, `low`, or `unknown`.

## Output

Use `templates/candidate-scorecard.md` when a persisted artifact is useful.
Return:

1. scorecard table;
2. hard-gate results;
3. recommended candidate or split recommendation;
4. rejected candidates with reasons, or an explanation that only one source
   was available;
5. next action: inspect selected source, produce blueprint, ask the user, or
   stop.
