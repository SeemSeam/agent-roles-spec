# Archi CCB Adapter Tooling Alignment

Date: 2026-06-07

## Problem

The CCB source integration for `agentroles.archi` has moved to the global npm
`@seemseam/archi` package, but the `agent-roles-spec` CCB adapter still carries
older `ccb-archi` and Python venv assumptions.

Current evidence:

- CCB source special-cases `agentroles.archi` / `architec` tool hooks and
  installs or checks `npm install -g @seemseam/archi` plus `shutil.which("archi")`.
- `bin/ccb-arch` in CCB source forwards directly to `archi`.
- Local runtime evidence showed global npm `archi` at `0.2.15` with
  `archi --check .` passing LLM preflight, while the legacy CCB-managed
  `ccb-archi` wrapper remained at `0.2.10` and failed before LLM validation.
- `roles/archi/adapters/ccb/memory.md` and
  `roles/archi/adapters/ccb/skills/archi-tooling/SKILL.md` still prefer
  `ccb-archi`.
- `roles/archi/adapters/ccb/tools/architec_tool.py` still installs Python
  `architec`, `hippocampus`, and `llmgateway` into a managed venv and writes a
  `ccb-archi` wrapper.

## Goal

Make the `agentroles.archi` CCB adapter source of truth match the current CCB
and Archi runtime:

```text
role tool dependency -> npm @seemseam/archi -> archi CLI -> bundled Hippo/llmgateway capabilities
```

The adapter should not tell agents to prefer `ccb-archi`, should not recreate
the old Python venv, and should not split Hippo or llmgateway installation into
separate pip dependencies.

## Non-Goals

- Do not change the core `agentroles.archi` role identity or responsibilities.
- Do not change CCB project runtime behavior, role locks, ask routing, sidebar
  behavior, or provider projection.
- Do not store llmgateway credentials or config in role assets.
- Do not require a CCB-managed Python venv for Archi analysis.

## Proposed Scope

1. Update `roles/archi/adapters/ccb/memory.md`.
   - Prefer `archi`.
   - Treat `ccb-archi` as legacy/stale if present.
   - Recommend `archi --check .`, `archi --version`, and `archi --help`.

2. Update `roles/archi/adapters/ccb/skills/archi-tooling/SKILL.md`.
   - Replace `ccb-archi --check . || archi --check .` with `archi --check .`.
   - Remove managed venv dependency diagnosis as the preferred path.
   - Diagnose npm `archi` availability, version, and LLM preflight.

3. Replace `roles/archi/adapters/ccb/tools/architec_tool.py`.
   - Install/update should run `npm install -g @seemseam/archi`.
   - Doctor should probe `archi` and report bundled Hippo/llmgateway capability
     as package-bundle availability.
   - It may still detect an existing `ccb-archi` wrapper as legacy residue, but
     must not select it as the main route.

4. Sync `reference_roles/archi/...` with the catalog role.

5. Update tests.
   - Executable tests for this adapter alignment should live in the repository
     root test suite, primarily `tests/test_archi_ccb_tool.py`.
   - Role-local `roles/archi/tests/validation.md` remains human-readable role
     validation guidance, not the executable adapter-tool test location.
   - Replace venv repair/rebuild tests with npm install/update/doctor tests.
   - Keep role/reference sync tests.
   - Add a regression test that `archi-tooling` and adapter memory do not prefer
     `ccb-archi`.
   - Preserve no-secret-output assertions for llmgateway config detection.

6. Update metadata.
   - Bump or patch `roles/archi/role.toml` version and `updated_at`.
   - Sync `reference_roles/archi/role.toml`.
   - Update adapter network note from Python package source to npm package
     source.

## CCB Source Follow-Up

CCB source already routes role tool hooks through npm `archi`, but a separate
cleanup may be useful:

- mark old CCB-owned `ccb-archi` wrappers as deprecated;
- optionally remove or rewrite CCB-owned symlinks that point to stale managed
  venv wrappers;
- keep `bin/ccb-arch` as a thin compatibility forwarder to `archi`.

This is a CCB source follow-up, not required for the `agent-roles-spec` adapter
alignment patch unless release reviewers decide stale wrapper residue is a
blocking support issue.

## Risks

- Removing `ccb-archi` as preferred route may surprise users with only the old
  managed wrapper installed. Mitigation: doctor output should clearly say to
  install or update `@seemseam/archi`.
- Existing `agent-roles-spec` tests are built around managed venv repair. They
  should be replaced rather than carried forward as stale compatibility tests.
- `archi --check .` can refresh generated `.hippocampus` / `.architec`
  artifacts. Documentation should keep that warning.

## Acceptance Criteria

- `roles/archi` and `reference_roles/archi` stay byte-for-byte synchronized for
  shared adapter files expected by tests.
- The first check finds no preferred-path guidance for `ccb-archi`, managed
  Python venvs, or split Python installs:

  ```bash
  rg 'Prefer `?ccb-archi`?|ccb-archi --check|ccb-archi --version|command -v ccb-archi|managed Architec venv|Python venv|pip install' roles/archi reference_roles/archi
  ```
- The second check lists any remaining `ccb-archi` mentions for manual review;
  every remaining mention must be explicitly framed as legacy, stale, or
  residue rather than a recommended route:

  ```bash
  rg -n 'ccb-archi' roles/archi reference_roles/archi
  ```
- `agentroles.archi` adapter install/update uses npm `@seemseam/archi`.
- Adapter doctor reports the selected `archi` binary and does not print
  llmgateway secrets.
- `tests/test_archi_ccb_tool.py` covers npm install/update/doctor,
  no-secret diagnostics, stale wrapper non-preference, and role/reference sync.
- CCB source `ccb roles doctor agentroles.archi` continues to report the npm
  `archi` CLI as available when `archi` is on `PATH`.

## Implementation Result

Implemented in `agent-roles-spec` on 2026-06-07:

- `roles/archi` and `reference_roles/archi` CCB adapter files now prefer npm
  `@seemseam/archi` and the `archi` binary.
- Adapter install/update runs `npm install -g @seemseam/archi`.
- Adapter doctor selects `archi`, reports bundled Hippo/llmgateway capability,
  treats missing llmgateway config as degraded readiness, and reports any
  existing `ccb-archi` wrapper only as ignored legacy residue.
- `tests/test_archi_ccb_tool.py` covers npm install/update/doctor, no-secret
  diagnostics, stale wrapper non-preference, role/reference sync, and store
  current behavior for `agentroles.archi`.
- Role metadata was bumped to `0.2.2` with `updated_at =
  "2026-06-07T09:00:00Z"`.

## Review Questions

1. Should `ccb-archi` be mentioned at all as legacy residue, or omitted from the
   Role adapter docs entirely?
2. Should the adapter tool script remain in the Role package when CCB source
   already has a built-in special-case for `agentroles.archi`, or should it stay
   for hosts that execute role-declared tool hooks directly?
3. Should stale CCB-owned `ccb-archi` symlink cleanup happen in CCB source in the
   same release window or as a follow-up?
