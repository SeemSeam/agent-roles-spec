---
name: open-design-workbench
description: Use when a task should consult or orchestrate the vendored Open Design workbench, including upstream skills, design systems, templates, plugins, docs, CLI source, MCP guidance, or design review workflows.
---

# Open Design Workbench

Use this wrapper skill when the user asks for Open Design behavior, design
skill selection, design-system work, DESIGN.md authoring, visual direction,
prototype/deck/image/video design, Open Design MCP or CLI setup planning, or a
design review based on normalized Role content and vendored upstream source.

## Workflow

1. Identify the requested Open Design surface: skill, design system, template,
   plugin, docs, CLI/MCP setup, or design artifact.
2. Search the vendored source before inventing a workflow:
   - `skills`
   - `plugins`
   - `prompts`
   - `templates/open-design-runtime-config`
   - `references`
   - `upstream/open-design/skills`
   - `upstream/open-design/design-systems`
   - `upstream/open-design/design-templates`
   - `upstream/open-design/templates`
   - `upstream/open-design/plugins`
   - `upstream/open-design/docs`
3. Read the most relevant upstream `SKILL.md`, `DESIGN.md`, README, or docs
   file before using it.
4. If runtime execution is requested, produce a setup plan first. Include Node,
   pnpm, `od`, daemon, plugin, MCP, local port, generated file, and credential
   implications. Do not claim the vendored source is already installed.
5. Keep project artifacts and runtime state outside this Role source.

## Output

Return the selected upstream source paths, the design or setup decision, and
the remaining runtime assumptions. For design output, include a concrete brief,
design-system decision, artifact handoff, or review findings rather than a
generic style suggestion.
