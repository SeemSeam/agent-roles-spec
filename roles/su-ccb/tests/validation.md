# SU-CCB Role Validation

Suggested checks:

1. Parse `roles/su-ccb/role.toml` with Python `tomllib`.
2. Load the Role with `agent_roles.manifest.load_role`.
3. Run `agent-roles list --json` with `AGENT_ROLES_SPEC_HOME` pointing at the
   repository and `AGENT_ROLES_NO_REMOTE=1`.
4. Confirm aliases resolve for `su-ccb`, `su_ccb`, `su.ccb`, and
   `ccb-workflow`.
5. Confirm key source files exist:
   - `skills/su-flow/SKILL.md`
   - `skills/ccb-execute/SKILL.md`
   - `lib/runtime/index.mjs`
   - `references/kernel/README.md`
   - `plugins/claude-ccb/plugin.json`
6. For adapter development, project the Role into an isolated test project and
   verify generated projection output is removable without editing Role source.
