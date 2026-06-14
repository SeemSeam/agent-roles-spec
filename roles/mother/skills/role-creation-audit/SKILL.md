# Role Creation And Audit

Use this skill when creating a new Agent Role, reviewing an existing Role, or
repairing Role source for spec compliance and catalog readiness. If the request
starts from an external skill, plugin, prompt, tool, or workflow repository,
route through `role-source-ingest` before writing Role source. If the request
starts from a broad role idea or requires source discovery, route through
`role-research`, `role-candidate-score`, and `role-blueprint` before writing.

## Inputs

- Target Role source path or proposed Role id.
- Requested mode: research, candidate-score, blueprint, create,
  source-ingest, audit, repair, or explain.
- External source URL/path/ref when the Role will be derived from existing
  skills, plugins, prompts, tools, or workflows.
- Applicable host targets, if any.
- Publication target: local draft, `reference_roles/`, or `roles/` catalog.
- User preference for one Role, multiple Roles, or a split recommendation.
- Whether public web research is allowed or expected for current skill
  construction guidance.
- Research evidence, candidate scorecard, or blueprint artifacts when already
  produced.

## Workflow

1. Establish scope.
   - Confirm whether the task is authoring, auditing, or both.
   - Identify the canonical Role id, expected aliases, catalog level, and host
     adapter targets.
   - If the request is broad or depends on uncertain external knowledge, stop
     before writing and run `role-research` to produce a research brief and
     evidence.
   - If multiple candidate sources exist, run `role-candidate-score` before
     selecting a source or design.
   - If external source is involved, stop before writing and run the
     `role-source-ingest` workflow to produce inventory, classification,
     packaging decision, blueprint, and validation plan.
   - Before creating or patching Role source, run `role-blueprint` or produce
     an equivalent blueprint gate with explicit write scope.
   - Surface naming risks before writing public ids or aliases.
2. Read authoritative context.
   - Check `specs/role-v1.md`, `specs/metadata-v1.md`,
     `specs/host-adapters-v1.md`, `CONTRIBUTING.md`, `aliases.toml`, and
     nearby role examples.
   - For skill construction, read
     `references/skill-construction-research.md` before using web research or
     recommending scripts, references, assets, trigger metadata, or validation
     strategy.
   - Use `templates/research-brief.md`,
     `templates/candidate-scorecard.md`, `templates/role-blueprint.md`, and
     `templates/evaluation-report.md` when the design needs durable artifacts.
   - Prefer current repository terminology: Role, Role Definition, Host
     Adapter, mount Role, and unmount Role.
3. Research skill construction when useful.
   - Use public web search only when local specs/examples are insufficient or
     host-specific skill behavior may have changed.
   - Prefer official docs, open standards, and maintained examples. Label
     blogs or community posts as advisory if used.
   - Record source URLs and access date in the design notes when research
     changes the Role.
   - Never cite unopened sources. Label source authority and confidence.
   - Record rejected candidates or explain why only one candidate exists.
   - Do not paste third-party examples wholesale into Role source.
4. Create or inspect source.
   - For external source conversions, do not write into `roles/<id>/` until a
     blueprint exists and the write scope is clear.
   - Ensure `role.toml`, `README.md`, and durable role memory exist.
   - Add at least one useful content source such as a skill, prompt, tool note,
     plugin, adapter note, or validation fixture.
   - For each skill, define trigger conditions, progressive-disclosure
     references, scripts/assets if justified, security boundaries, and
     realistic validation prompts.
   - Keep host-specific behavior in adapter metadata or adapter docs.
5. Audit compliance.
   - Validate metadata shape, semver, timestamps, catalog level, contents
     inventory, aliases, advisory permissions, and adapter hints.
   - Check memory, skills, prompts, tools, plugins, adapters, tests, and README
     files for forbidden content and source/projection boundary drift.
   - Confirm no secrets, provider sessions, runtime pid/socket/lifecycle files,
     conversation logs, task progress, or project-private state are present.
6. Optimize.
   - Tighten purpose, responsibilities, and non-goals.
   - Narrow permissions and clarify whether writes, network, or secrets are
     truly needed.
   - Improve skill trigger descriptions, reference splits, scripts/assets
     justification, adapter boundaries, unsupported-content behavior,
     install/update notes, cleanup expectations, and validation coverage.
   - Make list/install compatibility explicit with aliases and catalog docs.
   - For complex workflow sources, keep the single-role versus multi-role or
     topology decision visible in README, memory, adapter notes, or tests.
   - For generated Roles, define realistic success prompts and negative prompts
     before publication.
7. Verify.
   - Parse all touched TOML.
   - Run focused role tests when available.
   - For external source conversions, run the local inventory helper or explain
     why it was not applicable:

     ```bash
     python roles/mother/scripts/inventory_external_source.py <source-path> --pretty
     ```

   - Run `agent-roles list --json` or the repository's equivalent list command
     with a clean temporary `AGENT_ROLES_STORE`.
   - Run broader tests when the change affects shared catalog behavior.

## Review Output

Lead with findings. For each finding include:

- severity: `blocker`, `major`, `minor`, or `suggestion`;
- file or path reference;
- evidence;
- impact;
- recommended fix.

After findings, include open questions, verification performed, and residual
risks. If no issues are found, state that directly and identify any remaining
test gaps.

## Authoring Output

When creating a Role, report:

- created files;
- canonical id and aliases;
- catalog level and permission posture;
- skill construction research sources, if web research informed the design;
- adapter boundary decisions;
- source inventory and blueprint decisions when external source was ingested;
- verification commands and results;
- naming concerns or publication risks.

If writing cannot be completed, report one of: `draft`, `rollback`, or
`blocked`, with dirty paths and remaining validation gaps.
