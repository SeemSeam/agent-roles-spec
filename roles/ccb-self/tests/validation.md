# CCB Self Validation Notes

Date: 2026-06-09

## Static Role Checks

- `agentroles.ccb_self` loads through the Agent Roles preview manifest loader.
- CCB adapter metadata declares `default_agent_name = "ccb_self"` and supports
  `codex` plus `claude`.
- The Role contains four generic skills:
  `ccb-self-diagnose`, `ccb-self-recover`, `ccb-self-chain`, and `ccb-config`.
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
