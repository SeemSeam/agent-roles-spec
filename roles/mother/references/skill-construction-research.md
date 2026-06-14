# Skill Construction Research Reference

Use this reference when `mother` is designing or auditing Role-carried skills,
prompts, or tool workflows and current external guidance would materially
improve the result.

## Research Boundaries

- Prefer official product documentation, open standards, and maintained example
  repositories over blogs or social posts.
- Search the web only for public information. Do not ask for, read, store, or
  print secrets, provider sessions, credentials, private project data, or
  paywalled/private docs.
- Record source URLs and access date in audit or authoring notes when web
  research affects the Role design.
- Summarize and synthesize. Do not copy third-party examples wholesale into
  Role source.
- Treat web evidence as advisory. The Agent Roles specs in this repository
  remain authoritative for Role source boundaries.

## Authoritative Sources Checked

Accessed on 2026-06-10:

- OpenAI Codex Agent Skills:
  https://developers.openai.com/codex/skills
- OpenAI API Skills guide:
  https://developers.openai.com/api/docs/guides/tools-skills
- Anthropic Agent Skills engineering article:
  https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
- Claude custom skills help:
  https://support.claude.com/en/articles/12512198-how-to-create-custom-skills
- Claude skill authoring best practices:
  https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices

## Skill Design Principles

- Keep each skill focused on one repeatable workflow. Multiple focused skills
  compose better than one broad helper.
- Make trigger metadata precise. The `description` should say what the skill
  does and when it should be used, with the most important trigger words early.
- Use progressive disclosure: keep the main skill file concise, then link to
  references for detailed or variant-specific material.
- Use scripts only when deterministic execution is more reliable than prose or
  when agents would otherwise rewrite the same code repeatedly.
- Use assets/templates for output resources that should be reused without
  loading large docs into context.
- Include examples only when they clarify expected input/output or prevent a
  common failure mode.
- Test incrementally: validate metadata, referenced files, trigger behavior,
  and realistic task output after each meaningful revision.
- Add explicit security boundaries when a skill uses scripts, network access,
  package installation, private files, or external services.

## Research Workflow For New Role Skills

1. Define the skill's narrow job, trigger conditions, expected outputs, and
   forbidden actions.
2. Check local Agent Roles specs, templates, and nearby role examples first.
3. If skill design depends on host-specific behavior or current external best
   practices, search official docs and maintained examples.
4. Choose an implementation shape:
   - instruction-only for high-judgment workflows;
   - references for detailed domain rules or variants;
   - scripts for deterministic, repeated, or fragile operations;
   - assets/templates for reusable output material.
5. Write concise skill instructions with clear workflow steps and validation.
6. Verify the skill with a realistic prompt, metadata/file checks, and any
   repository test harness.

## External Source Research Workflow

Use this workflow when converting an existing skill, plugin, prompt, tool, or
workflow repository into Role source.

1. Capture provenance: source URL or local path, ref/commit/tag, maintainer,
   package names, license, and access date.
2. Inventory the source before writing Role files. Prefer
   `scripts/inventory_external_source.py` when a local checkout is available.
3. Extract:
   - skill names, trigger descriptions, and entry commands;
   - progressive-disclosure references and examples;
   - scripts, runtime libraries, templates, assets, hooks, and generated
     validators;
   - package metadata, dependency expectations, tests, and release notes;
   - host-native plugin manifests and marketplace metadata;
   - runtime state paths, project-binding assumptions, and write behavior.
4. Classify each source item as Role memory, Role skill, Role reference,
   tool/runtime support, plugin content, adapter note, validation fixture,
   Project Binding, runtime state, or excluded material.
5. Decide packaging shape:
   - one Role when one specialist identity owns the workflow;
   - multiple Roles when memory, providers, permissions, or lifecycle contracts
     must differ;
   - future team/topology recipe when the source is an agent network rather
     than one Role identity.
6. Produce a blueprint before copying files into `roles/<id>/`.

## First-Class Artifacts

For substantial Role design work, keep these artifacts explicit:

- research brief: target domain, intended users, target hosts, non-goals,
  publication target, user priorities, allowed research surfaces, and minimum
  evidence.
- research evidence: inspected source locator, access date, authority label,
  license/provenance status, extracted facts, confidence, and design impact. Use
  `schemas/research-evidence.schema.json` for checkable JSON when useful.
- candidate scorecard: hard gates, 0 to 3 scoring dimensions, rejected
  candidates, confidence, and user-priority overrides. Use
  `schemas/candidate-scorecard.schema.json` for checkable JSON when useful.
- Role blueprint: Role id, aliases, catalog level, single-role versus
  multi-role/topology decision, contents map, permissions, adapters,
  structured provenance, validation plan, write scope, and stop conditions. Use
  `schemas/role-blueprint.schema.json` for checkable JSON when useful.
- evaluation report: metadata checks, source-boundary checks, realistic
  prompts, negative prompts, results, blockers, and residual risk. Use
  `schemas/evaluation-report.schema.json` for checkable JSON when useful.

Templates live under `templates/`. They are preferred when the artifact should
be reviewed by a maintainer, attached to a plan, or reused during repair.

## Audit Questions

- Is the skill name specific, lowercase/hyphenated when required by its host,
  and easy to search?
- Does the trigger description avoid vague terms such as "helper" or "utils"?
- Does the skill body contain only essential instructions?
- Are large references split into linked files that can be loaded only when
  needed?
- Are scripts documented, bounded, and testable?
- Does the skill avoid hidden installers, secrets, project state, conversation
  logs, and host-generated projection output?
- Does validation cover both metadata shape and realistic behavior?
