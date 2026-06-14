# Role Audit Prompt

Use this prompt to request a structured audit of Agent Role source.

```text
Audit the Agent Role at <path-or-role-id> for Agent Roles preview compliance
and catalog readiness.

Check:
- role.toml metadata, semver, timestamps, catalog level, contents inventory,
  aliases, permissions, and adapter hints
- README, memory, skills, prompts, tools, plugins, adapters, and tests
- source boundary separation from Project Binding, mounted runtime state,
  provider state, generated projection output, secrets, and task progress
- purpose, responsibilities, non-goals, interaction mode, action posture, and
  permission minimization
- research-backed design claims for inspected sources, access dates, authority
  labels, confidence, and rejected candidates
- for Roles derived from external source, provenance, inventory evidence,
  source-boundary decisions, and single-role versus multi-role/topology
  decisions
- blueprint write scope and evaluation report coverage for realistic success
  prompts and negative prompts
- list/install compatibility and validation coverage

Return findings first, ordered by severity. For each finding include severity,
path reference, evidence, impact, and a concrete fix. Then list open questions,
verification performed, and residual risks.
```
