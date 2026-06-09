# Release Checklist

Target: `v0.1.0-spec-preview`

## Required

- [x] README explains Agent Roles as a host-neutral role specification.
- [x] README explains developer value: from skill development to role
  development.
- [x] README explains user value: from scattered skills/plugins to managed
  roles.
- [x] README states that the specification comes before CLI, role manager, and
  mount runtime.
- [x] Apache-2.0 license is present.
- [x] Contribution rules forbid secrets, credentials, provider sessions, and
  runtime state.
- [x] Role preview specs are present under `specs/`.
- [x] Starter templates are present under `templates/`.
- [x] A publisher-neutral reference role is present under `reference_roles/`.
- [x] Host adapter contract previews are present for Claude Code, Codex, CCB,
  and Hive.
- [x] Conformance preview fixtures are present.

## Before Publishing

- [ ] Create the public GitHub repository.
- [ ] Confirm repository description:
  `From skills to roles: a host-neutral role specification for portable specialist AI agents.`
- [ ] Confirm default branch.
- [ ] Confirm issue templates are enabled.
- [ ] Confirm secret scanning is enabled if available.
- [ ] Tag `v0.1.0-spec-preview`.
- [ ] Open follow-up issues for schema stabilization, validator CLI, community
  roles, adapter contracts, and conformance harnesses.

## PyPI Preview Release

Target package: `agent-roles` `0.1.1`

- [x] Add Python package metadata in `pyproject.toml`.
- [x] Add `agent-roles` console script entrypoint.
- [x] Add `upgrade`, strict `update`, and `--version` CLI behavior.
- [x] Ensure published catalog Roles carry package version metadata and
  revision timestamps.
- [x] Add GitHub Actions PyPI Trusted Publishing workflow at
  `.github/workflows/pypi.yml`.
- [x] Verify wheel/sdist build, `twine check`, wheel install, and CLI startup in
  a temporary environment.
- [ ] In PyPI, create a pending trusted publisher for:
  - PyPI project name: `agent-roles`
  - Owner: `SeemSeam`
  - Repository: `agent-roles-spec`
  - Workflow: `pypi.yml`
  - Environment: `pypi`
- [x] In GitHub, confirm the `pypi` environment exists and requires maintainer
  approval before publish.
- [ ] Publish a GitHub Release for tag `v0.1.1` or manually dispatch
  `Publish Python package`.
- [ ] Confirm `pipx install agent-roles` installs the uploaded package.

## npm Preview Release

Target package: `agent-roles` `0.1.1`

- [x] Confirm npm package name `agent-roles` is published and target version
  `0.1.1` is not currently published before the next npm release.
- [x] Add npm package metadata with `agent-roles` in `keywords`.
- [x] Add an npm `agent-roles` bin wrapper that invokes the bundled Python
  module.
- [x] Keep installable catalog Role content under `roles/` out of the npm
  package while retaining templates, reference roles, specs, schemas, and
  conformance fixtures.
- [x] Verify `npm pack --dry-run`, tarball install, `agent-roles --version`,
  tarball payload without `roles/` but with `templates/` and
  `reference_roles/`, and catalog-backed `agent-roles list --json`.
- [x] Publish to npm only after confirming the dirty worktree state and package
  payload.
- [x] Confirm `npm install -g agent-roles` installs the uploaded package.
- [x] Confirm npm registry reports `agent-roles@0.1.1` as `latest` and a
  temporary install can run `agent-roles --version`, `agent-roles list`, and
  `agent-roles install --all`.
- [x] Add GitHub Actions npm Trusted Publishing workflow at
  `.github/workflows/npm.yml`.
- [x] Create the GitHub `npm` environment with maintainer approval before
  publish.
- [x] Configure npm trusted publisher for package `agent-roles`, repository
  `SeemSeam/agent-roles-spec`, workflow `npm.yml`, and environment `npm`.

## npm Maintenance Release

Target package: `agent-roles` `0.1.2`

- [x] Confirm npm registry reports `agent-roles@0.1.1` as latest before the
  `0.1.2` release.
- [x] Verify tests, TOML parsing, `npm run smoke`, and `npm pack --dry-run`.
- [ ] Publish `agent-roles@0.1.2` through trusted publishing or an authenticated
  local npm publish.
- [ ] Confirm npm registry reports `agent-roles@0.1.2` as latest after publish.

## Explicitly Deferred

- registry or marketplace
- security sandbox
- complete permissions runtime
- live mount/unmount runtime
- automatic hot reload across hosts
- CCB runtime extraction
- provider session management
