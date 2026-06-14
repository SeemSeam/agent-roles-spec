# Role Creation Prompt

Use this prompt to request a structured Role creation pass.

```text
Create an Agent Role draft for <role-idea-or-domain>.

Ask for missing information before writing if the role id, responsibilities,
non-goals, target catalog level, host targets, expected skills, network posture,
publication target, or source provenance are unclear.

If this Role is derived from an existing skill, plugin, prompt, tool, workflow,
or repository, first perform research, candidate scoring, and source ingestion
as applicable:
- produce a research brief before broad discovery
- cite only inspected sources and record access dates
- score candidate sources with hard gates and rejected candidates when multiple
  sources are considered
- record source URL/path/ref, license, maintainer, and access date
- inventory skills, references, scripts, templates, hooks, plugin manifests,
  tests, package metadata, runtime write paths, and forbidden-content risks
- classify each source area as Role memory, skill, reference, tool/runtime
  support, plugin content, adapter note, validation fixture, Project Binding,
  runtime state, or excluded material
- produce a blueprint gate before writing into `roles/<id>/`

Design:
- canonical role id and useful aliases
- research evidence and candidate scorecard when external research affected
  the design
- source-ingest blueprint when external source is involved
- role.toml metadata, identity, contents inventory, advisory permissions, and
  host adapter display names
- durable memory instructions with no project-specific state
- one or more focused skills with trigger conditions, workflow, forbidden
  actions, and validation
- reusable prompts or references when they improve repeatability
- README and validation notes
- evaluation report with realistic success prompts and negative prompts before
  publication

If current external skill-construction guidance would materially improve the
skill design, perform public web research first. Prefer official docs and
maintained examples, cite source URLs and access date, and synthesize the
guidance instead of copying examples wholesale.

Return:
1. proposed file tree
2. key design decisions and tradeoffs, including single-role versus multi-role
   or topology decision when source content implies multiple surfaces
3. research, scorecard, blueprint, and evaluation artifacts or where they are
   intentionally omitted
4. patch plan or created files
5. verification commands
6. publication risks or open questions
```
