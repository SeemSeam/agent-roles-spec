# Package Manager And Roles Store

Date: 2026-06-04

## Objective

Define the first `agent-roles` package-management layer for `.roles` content
sync, installation, update/upgrade, diagnostics, digest metadata, and alias
migration.

This layer is host-neutral package management. Hosts such as CCB still own
project config, project locks, projection, reload, prompt policy, localized
output, and runtime behavior.

## Responsibilities

`agent-roles` owns:

- catalog discovery and sync
- the `.roles` package store
- `list`, `install`, `update`, `upgrade`, `sync`, `doctor`, and `resolve`
- role version, revision timestamps, digest, source, provenance, and installed
  path metadata
- aliases such as `ccb.archi -> agentroles.archi`
- package-level validation and machine-readable diagnostics

Hosts own:

- project adoption and locks
- provider/session/runtime projection
- host-specific tool execution policy
- human prompts and i18n
- daemon, sidebar, ask, mailbox, and reload behavior

## First CLI Slice

The first executable slice exposes JSON output:

```bash
agent-roles list --json
agent-roles install agentroles.archi --json
agent-roles update agentroles.archi --json
agent-roles upgrade agentroles.archi --json
agent-roles upgrade --all --json
agent-roles sync . --json
agent-roles doctor agentroles.archi --json
agent-roles resolve agentroles.archi --json
```

The repo-local `cli/agent-roles` wrapper calls the same Python module. Host
adapters should consume the JSON form and ignore the human text form.

`install` creates or refreshes a package-store entry. `update` is intentionally
stricter: it refreshes one already installed Role and fails if the Role is not
installed. `upgrade` is the user-facing update alias, and `upgrade --all`
refreshes every installed Role.

Role JSON payloads should expose `version`, content digest, and source revision
timestamps (`created_at` and `updated_at`) when present in `role.toml`.

## Store Shape

The preview default is:

```text
~/.roles/
  catalogs/
  installed/
    agentroles.archi/
      current -> versions/<version>/<digest>/
      install.json
      versions/<version>/<digest>/
```

`AGENT_ROLES_STORE` may override this root for tests and host-managed
environments.

## CCB Compatibility

The first CCB compatibility requirements are:

- canonical id `agentroles.archi`
- legacy alias `ccb.archi`
- content-addressed installed paths
- stable JSON for install/update/upgrade/sync/list/doctor/resolve
- role revision fields that CCB can show in UI or copy into locks
- installed paths that CCB can project from without network access
- metadata that CCB can copy into `.ccb/role-lock.json`

CCB may keep a compatibility bridge for its current
`$XDG_DATA_HOME/ccb/roles/` store while it learns to read the spec-owned
`.roles/installed` store.
