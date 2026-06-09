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
- list/install compatibility and validation coverage

Return findings first, ordered by severity. For each finding include severity,
path reference, evidence, impact, and a concrete fix. Then list open questions,
verification performed, and residual risks.
```
