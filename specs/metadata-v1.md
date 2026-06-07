# Metadata v1 Preview

Status: draft preview

## Purpose

`role.toml` gives a Role a stable identity and reviewable boundaries.

The preview metadata convention is intentionally small. It should be enough for
humans and validators to understand a role without locking the final schema too
early.

## Minimal Example

```toml
schema = "agent-role/preview-0.1"
id = "agentroles.archi"
name = "Architecture Reviewer"
version = "0.1.0"
created_at = "2026-06-04T00:00:00Z"
updated_at = "2026-06-04T00:00:00Z"
description = "Reviews architecture boundaries, coupling, and maintainability."
license = "Apache-2.0"

[catalog]
level = "stable"

[identity]
purpose = "Review architecture drift, boundaries, coupling, and structural risk."
responsibilities = [
  "Review diffs for architecture risk",
  "Explain structural tradeoffs",
  "Recommend practical next steps"
]
non_goals = [
  "Implement business features",
  "Approve releases automatically"
]
```

## Required Preview Fields

- `schema`: metadata format marker. The preview schema identifier is not
  stable. Validators should treat any `agent-role/preview-*` value as draft and
  subject to change before v1.
- `id`: stable role id. It should not depend on a local agent instance name.
- `name`: human-readable role name.
- `version`: Role semantic version. Use semver (`MAJOR.MINOR.PATCH`). This is
  not the same as the `agent-roles` npm/PyPI package version.
- `description`: short role summary.
- `license`: role package license.
- `identity.purpose`: why the role exists.
- `identity.responsibilities`: what the role owns.
- `identity.non_goals`: explicit boundaries.

## Optional Preview Fields

Preview roles may add sections for:

- `created_at`: original role publication timestamp.
- `updated_at`: latest role content revision timestamp.
- `contents`: role-contained memory, skills, prompts, tools, plugin content,
  and tests.
- `catalog.level`: catalog maturity level. Allowed values are `experimental`,
  `preview`, `stable`, and `deprecated`. If omitted, package-manager tooling
  should treat the Role as `preview`.
- `permissions`: declared needs, not automatic grants.
- `adapters`: host-specific metadata.
- `maintainers`: role maintainers or review owners.

Optional fields are advisory in the preview. They should be reviewable and
host-neutral unless placed under a host-specific adapter section.

Published catalog roles should include both `created_at` and `updated_at`.
Timestamps should use ISO 8601 / RFC 3339 date or date-time strings, preferably
UTC date-times such as `2026-06-04T00:00:00Z`.

## Version And Revision Rules

`version` is the Role's own semantic version. It is intentionally separate from
the `agent-roles` npm/PyPI package version: Role catalog changes are published
through catalog sources such as GitHub, while the npm/PyPI package versions the
CLI and package-manager implementation.

The `.roles/installed` store keys installed content by role id, Role version,
and content digest. The digest is part of the revision identity, so small
same-version catalog patches can be detected and updated without forcing a Role
version bump.

`updated_at` is revision metadata for humans, catalogs, and host adapters. It
does not replace `version`; it helps hosts display when a Role changed and gives
maintainers a stable timestamp even when preview content changes are still too
small for a final semver policy.

When role behavior, bundled skills, tools, adapters, or memory change,
maintainers should update `updated_at`. They should bump `version` when the
change alters the user-visible Role contract or compatibility expectations.
Documentation, metadata, adapter-note, and other small catalog patches may keep
the same Role `version`; package-manager tooling should expose the changed
digest and an update reason such as `digest_changed`.

`catalog.level` is a catalog quality/maturity signal, not a compatibility
guarantee. Suggested meanings:

- `experimental`: early Role, API/content may change without notice.
- `preview`: usable preview Role, still being hardened.
- `stable`: production-ready catalog Role with reviewed content and adapter
  notes.
- `deprecated`: retained for compatibility; users should migrate away.

## Full Example With Optional Fields

```toml
schema = "agent-role/preview-0.1"
id = "agentroles.archi"
name = "Architecture Reviewer"
version = "0.1.0"
created_at = "2026-06-04T00:00:00Z"
updated_at = "2026-06-04T00:00:00Z"
description = "Reviews architecture boundaries, coupling, and maintainability."
license = "Apache-2.0"

[catalog]
level = "stable"

[identity]
purpose = "Review architecture drift, boundaries, coupling, and structural risk."
responsibilities = [
  "Review diffs for architecture risk",
  "Explain structural tradeoffs",
  "Recommend practical next steps"
]
non_goals = [
  "Implement business features",
  "Approve releases automatically"
]

[contents]
memory  = ["memory.md"]
skills  = ["skills/architecture-review"]
prompts = ["prompts/architecture-review.md"]
tools   = ["tools/README.md"]
plugins = ["plugins/archi-workbench"]

[permissions]
read_files  = true
run_tools   = ["tools/README.md"]
network     = false

[adapters."claude-code"]
display_name = "archi"

[adapters.ccb]
display_name = "archi"

[[maintainers]]
name  = "Example Maintainer"
email = "maintainer@example.com"
```

## Identity Rule

The role id is not the same thing as the mounted agent instance name.

A Role may recommend a display or instance name, but hosts decide how role
instances are named in their own runtime.
