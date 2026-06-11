# CCB Self Validation Notes

Date: 2026-06-11

## Static Role Checks

- `agentroles.ccb_self` loads through the Agent Roles preview manifest loader.
- CCB adapter metadata declares `default_agent_name = "ccb_self"` and supports
  `codex` plus `claude`.
- The Role contains six generic skills:
  `ccb-self-diagnose`, `ccb-self-recover`, `ccb-self-chain`,
  `ccb-comm-reply-recover`, `ccb-expert-reference`, and `ccb-config`.
- The Role declares CCB expert references for source, GitHub, talk1 manuals,
  command/config, runtime flows, role/config system, release/test gates, and
  knowledge refresh.
- The Role memory includes symptom-to-skill routing for expert answers,
  config work, diagnosis, recovery, lineage repair, and user-visible reply
  stalls.
- The full private `ccb-config` skill is source content for this Role only.
  Common inherited skill folders must not contain or install it for non-self
  agents.

## Runtime Contract Checks

The accepted draft was exercised from an isolated CCB source test project
before materialization:

- `ccb_test --diagnose`: confirmed source validation did not run from the CCB
  source checkout.
- `ccb_test config validate`: valid project config.
- `ccb_test reload --dry-run`: no-mutation reload plan.
- `ccb_test doctor logs codexer`: command syntax works.
- `ccb_test fault list` and `ccb_test fault clear all`: fault command syntax
  works without active rules.
- Draft `tools/doctor.py` with `CCB_BIN=ccb_test`: JSON `status: ok` with
  seven read-only evidence commands.

`ccb restart <agent>` is implemented in the CCB source CLI surface. The recover
skill treats it as the only guarded single-agent runtime replacement command,
and reports `blocked` or `failed` responses instead of simulating restart with
raw tmux mutation.

## V0.2 Expert Validation

After adding `ccb-expert-reference` and eleven role references:

- `python -m pytest -q tests/test_ccb_self_role.py`: `6 passed`.
- `python -m pytest -q`: `33 passed`.
- `python -m py_compile agent_roles/manifest.py tests/test_ccb_self_role.py
  roles/ccb-self/adapters/ccb/tools/doctor.py`: passed.
- Manifest load reported `agentroles.ccb_self 0.2.0` with `6` skills and `11`
  role references.
- `git diff --check`: passed.
