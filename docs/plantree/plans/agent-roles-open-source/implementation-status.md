# Agent Roles Open Source Implementation Status

Date: 2026-06-14

## Current Phase

Preview package-manager hardening, PyPI/npm release preparation, and
`agentroles.mother` capability planning.

## Current Review Target

`agentroles.mother` is being aligned as the preview Role for creating,
ingesting, and auditing Agent Role source, including bounded public web
research for skill construction tools and techniques. The local catalog
contains `mother`, `role-mother`, `role-author`, and `role-auditor` aliases;
README/i18n Published Roles sections list it as a preview Role; and the plan
direction is captured in
[topics/mother-role-creation-audit.md](topics/mother-role-creation-audit.md).
The 2026-06-12 mounted `mother` session exposed the need for external
skill/plugin repository ingestion with blueprint gates, deterministic scans,
and draft-safety rules. The first P0 landing is now in `agentroles.mother`
`0.2.1`: `role-source-ingest`, write-gate memory, external-source research
workflow, local inventory script, README/i18n sync, and tests. The deeper
capability target is now captured in
[topics/mother-research-role-design-capability.md](topics/mother-research-role-design-capability.md):
research brief, source discovery, candidate scoring, blueprint synthesis,
write-gated scaffolding, and evaluation. The 2026-06-13 mother self-review
accepted the direction but made enforceable artifacts the next gate. That gate
landed in `agentroles.mother` `0.2.2` on 2026-06-14 with focused
`role-research`, `role-candidate-score`, and `role-blueprint` skills,
first-class artifact templates, four preview artifact schemas, hardened memory
rules, README/i18n synchronization, and tests.

Preview package-manager catalog semantics now separate the `agent-roles`
npm/PyPI package version from GitHub-published Role catalog revisions. Roles
carry their own semantic `version`, optional `[catalog] level`, `updated_at`,
and content digest; same-version catalog patches can be reported as
`digest_changed` without requiring an npm/PyPI package release.

`agentroles.archi` CCB adapter tooling has been aligned with the npm
`@seemseam/archi` CLI. CCB source installs/checks the npm `archi` command, and
this repository's Role adapter memory, `archi-tooling` skill, adapter metadata,
and adapter tool script now match that route instead of the older CCB-managed
`ccb-archi` Python venv path. See
[topics/archi-ccb-adapter-tooling-alignment.md](topics/archi-ccb-adapter-tooling-alignment.md).

Reviewer1 reviewed this plan on 2026-06-07 and returned `Proceed` with no
blocking plan issues. The plan was tightened to expand `ccb-archi` acceptance
checks and to make `tests/test_archi_ccb_tool.py` the executable test target for
adapter-tool behavior.

## Active Context

- Local source folder is now `/home/bfly/yunwei/agent-roles-spec`.
- GitHub remote is `https://github.com/SeemSeam/agent-roles-spec.git`.
- The previous local folder name was `/home/bfly/yunwei/agent-roles`.
- The temporary empty clone was moved aside as
  `/home/bfly/yunwei/agent-roles-spec.empty-clone-20260602-152023`.
- This plan tree was copied from the CCB repository and may contain older
  planning terms.

## Latest Naming Direction

- Project/spec: `Agent Roles`
- Core object: `Role`
- Definition file: `Role Definition`
- Host integration: `Host Adapter`
- Mount action: `mount Role`
- Repository name: `agent-roles-spec`
- CLI/package command: `agent-roles`

Avoid introducing `Pack` as the main artifact term. Earlier `RolePack`
references should be treated as historical planning language until migrated.

## Latest Design Clarification

- Treat Role source as a static module definition for v0.1.
- `role.toml` is the Role Definition: compact, machine-readable metadata and
  stable role boundaries.
- `memory.md` is durable role instruction content: prose guidance, working
  style, and operating boundaries for mounted agents.
- Task objectives, project scope, interaction topology, progress, and runtime
  state belong outside Role source in Project Binding, mounted role state, or
  host-owned runtime state.
- Project Binding is a concept for v0.1, not yet a required cross-host file
  format.
- Host adapter projection output must not be written back into Role source.
- Defer progress/state/plan directories, unified binding format, path-level
  permission semantics, runtime supervisor, and semantic drift enforcement.

## README Direction

- Emphasize Agent Roles as a general-purpose encapsulation specification for
  specialist AI agents.
- Do not foreground "host-neutral" in the first line; emphasize generality.
- Describe a Role as collecting the skills, memory, tool dependencies, plugin
  content, and host adapter metadata needed by one specialist agent.
- Emphasize easy mount/unmount and minimal interference with the main
  environment, user-global configuration, and other agents' working state.
- Omit a "Non-goals" section from the first Chinese README draft.
- Keep the "Published Roles" section synchronized across root and translated
  READMEs; use collapsible entries for formal catalog Roles and list version,
  catalog level, purpose, contents, adapters, install/update commands, and
  source.
- Present npm as the current public install path for the preview CLI; keep PyPI
  wording explicit that publishing is prepared but still pending trusted
  publisher completion.
- Use user-facing short commands in README examples: `archi` alias instead of
  `agentroles.archi`, omit `--json` by default, and mention `--json` only for
  adapters or automation.

## Last Landed

- 2026-06-09: Formalized the Role source / Project Binding / runtime state
  boundary in `specs/`, updated `roles/archi`, `reference_roles/archi`, starter
  templates, and conformance notes to avoid project state, path-level tool
  permission grants, and projection output inside Role source.
- 2026-06-09: Merged the boundary updates into `main`, released
  `agent-roles@0.1.2` through the npm trusted publishing workflow, and bumped
  `agentroles.archi` to `0.2.3`.
- 2026-06-14: Landed `agentroles.mother` `0.2.2` first-class artifact gates:
  research, candidate-score, and blueprint skills; research brief, scorecard,
  Role blueprint, and evaluation report templates; research evidence,
  candidate scorecard, Role blueprint, and evaluation report preview schemas;
  hardened memory rules; README/i18n sync; and tests.

## Active TODO

1. Prepare `agentroles.mother` `0.3.0`: deterministic audit/score/draft-check
   tools plus fixtures and golden examples for weak sources, runtime-state
   repos, license uncertainty, multi-agent workflows, and incomplete drafts.
2. Migrate specs, templates, conformance, and reference role wording from
   `RolePack` to `Role` where that reflects the current terminology decision;
   decide whether filenames such as `rolepack-v1.md` remain historical.
3. Complete PyPI Trusted Publishing for project `agent-roles`, then publish the
   first PyPI preview only after the GitHub workflow succeeds.
4. Continue hardening host adapter consumption of the preview CLI JSON contract
   and decide whether `created_at` / `updated_at` become required for all
   preview roles or only published catalog roles.

## Last Verification

- `python -m pytest -q` passed for the initial package-manager CLI tests on
  2026-06-04.
- `python -m compileall -q agent_roles` passed on 2026-06-04.
- `python -m pytest` passed after adding `upgrade`, strict `update`, and
  `--version` behavior on 2026-06-04.
- Temporary release build verification passed on 2026-06-04: copied the working
  tree to a temp source directory, ran tests, built wheel/sdist, ran
  `twine check`, installed the wheel in a temp venv, and verified
  `agent-roles --version` plus `agent-roles list --json`.
- Role revision metadata verification passed on 2026-06-04: all repository
  `role.toml` files include `version`, `created_at`, and `updated_at`; tests,
  compileall, wheel/sdist build, `twine check`, and installed-wheel CLI startup
  passed with timestamp fields present in JSON output.
- `agentroles.archi` CCB adapter tool repair verification passed on 2026-06-04:
  tests cover managed venv pip repair/rebuild failure paths, llmgateway-missing
  doctor degraded semantics, role/reference sync, and package-manager
  install/update/doctor store-current behavior.
- README published-role section sync was added on 2026-06-04 across the root
  README and translated README files under `docs/i18n/`.
- npm preview packaging verification passed on 2026-06-05: `agent-roles` and
  `agent-roles-spec` returned 404 from npm registry lookup, npm user
  `seemseam` was authenticated, `package.json` declares package
  `agent-roles@0.1.0` with `agent-roles` in `keywords`, Python tests passed,
  and `npm publish --dry-run --access public` reported a public latest-tag
  publish without writing to the registry. Follow-up direction: the npm package
  must not bundle installable catalog Role content under `roles/`; users should
  discover available Roles with `agent-roles list` against the configured
  catalog and install only the Roles they need.
- npm no-installable-Roles verification passed on 2026-06-05: the npm tarball
  retained templates, reference roles, specs, schemas, host adapter docs, and
  conformance fixtures, but excluded the installable `roles/` catalog
  directory. Temporary tarball install verified `agent-roles --version`, default
  remote-catalog `agent-roles list --json` discovered `agentroles.archi`, and
  the install command for `agentroles.archi` installed that Role on demand into
  the temp `.roles` store.
- npm publish completed on 2026-06-05: `agent-roles@0.1.0` is public on npm,
  `npm view agent-roles` reports `latest: 0.1.0`, temporary install verified
  `agent-roles --version`, `.github/workflows/npm.yml` was added, GitHub
  environment `npm` was created with maintainer approval, and npm trusted
  publisher was configured for `SeemSeam/agent-roles-spec`, workflow
  `npm.yml`, environment `npm`.
- CLI simplification verification passed on 2026-06-05: tests cover short role
  alias `archi`, `install --all`, and non-JSON `list` output while preserving
  JSON output for adapters and automation.
- npm trusted publish for `agent-roles@0.1.1` completed on 2026-06-05 from
  workflow run `27006878837` at commit `5b6a493`; npm registry reports
  versions `0.1.0` and `0.1.1` with `latest: 0.1.1`. A temporary npm install
  verified `agent-roles --version`, `agent-roles list`, and
  `agent-roles install --all` with the `archi` alias visible in plain output.
- PyPI remained unpublished on 2026-06-05: the PyPI JSON endpoint for
  `agent-roles` still returned 404 until PyPI-side pending trusted publisher
  configuration is completed.
- `agentroles.archi` CCB adapter npm-tooling alignment verification passed on
  2026-06-07: tests replaced venv repair coverage with npm install/update and
  doctor coverage, role/reference adapter files stayed synchronized,
  acceptance `rg` checks found no preferred `ccb-archi`/Python venv/pip route,
  and a real adapter doctor run selected npm `archi` 0.2.15 while reporting the
  old `ccb-archi` wrapper only as ignored legacy residue.
- Role catalog version/level separation verification passed on 2026-06-07:
  `agent-roles list` now exposes `catalog_level` and `update_reason`, a
  same-version `agentroles.archi` catalog metadata patch reports
  `update_available reason=digest_changed`, `roles/archi` and
  `reference_roles/archi` remain synchronized, and `python -m pytest` passed
  with 24 tests.
- On 2026-06-09, parsed all touched `role.toml` examples with Python
  `tomllib`.
- On 2026-06-09, searched specs, roles, reference roles, templates, and
  conformance for removed `run_tools` / `default_name` patterns and
  source/runtime boundary regressions.
- npm trusted publish for `agent-roles@0.1.2` completed on 2026-06-09 from
  workflow run `27194830188` at commit `a704d64`; npm registry reports latest
  `0.1.2`, temporary install verified `agent-roles --version`, and the
  published tarball contains `reference_roles/archi` version `0.2.3`.
- `agentroles.mother` preview Role validation passed on 2026-06-10:
  `python -m pytest tests/test_mother_role.py` passed, full `python -m pytest`
  passed with 31 tests, TOML parsing for `roles/mother` passed, and
  `agent-roles list --json` discovered `agentroles.mother` with preview level
  and the `mother`, `role-mother`, `role-author`, and `role-auditor` aliases.
  Follow-up design work on the same date bumped the Role to `0.2.0`, added
  bounded network research for skill construction, added creation/audit prompt
  coverage and a skill-construction research reference, and updated tests to
  require that inventory.
- On 2026-06-12, a mounted `mother` session attempting to package external
  SU-CCB skills showed that the Role needs stronger source-ingestion behavior:
  inventory and blueprint before writes, deterministic scans for provenance,
  imports, runtime state, and forbidden content, explicit single-role versus
  multi-role decisions, and a completion gate for partial drafts. The plan was
  recorded in
  [topics/mother-role-creation-audit.md](topics/mother-role-creation-audit.md).
- On 2026-06-12, `agentroles.mother` was bumped to `0.2.1` with
  `role-source-ingest`, source-ingest/write-gate memory, external-source
  research guidance, local `scripts/inventory_external_source.py`, README/i18n
  Published Roles synchronization, and tests for contents plus inventory-script
  classification. Focused verification passed:
  `python -m pytest tests/test_mother_role.py tests/test_su_ccb_role.py -q`
  and `python -m py_compile roles/mother/scripts/inventory_external_source.py`.
- On 2026-06-13, the deeper mother roadmap was split into
  [topics/mother-research-role-design-capability.md](topics/mother-research-role-design-capability.md).
  It defines `mother` as a research-to-role design operator, not merely a
  browsing-capable role: research brief, source discovery, candidate scorecard,
  source inventory, Role blueprint, write-gated scaffold, and evaluation report.
- On 2026-06-13, mother self-review feedback was incorporated into the
  planning tree. The accepted next gate is enforceability: add first-class
  templates or schemas for research evidence, candidate scorecards, Role
  blueprints, and evaluation reports before adding stronger scaffold
  automation.
- On 2026-06-14, `agentroles.mother` was bumped to `0.2.2` with
  `role-research`, `role-candidate-score`, and `role-blueprint`; reusable
  research brief, candidate scorecard, Role blueprint, and evaluation report
  templates; research evidence, candidate scorecard, Role blueprint, and
  evaluation report preview schemas; structured license/provenance fields;
  hardened memory rules; prompt/reference/README/i18n sync; and expanded tests
  with golden sample artifact schema checks. Focused and full verification
  passed:
  `python -m pytest tests/test_mother_role.py -q`, `python -m pytest -q`,
  TOML/JSON parsing, `py_compile` for the inventory script, `git diff --check`,
  and a temporary-store CLI `list/install/resolve` smoke test showing
  `agentroles.mother` `0.2.2`.
