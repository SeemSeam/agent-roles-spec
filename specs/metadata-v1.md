# Metadata v1 Preview

Status: draft preview

## Purpose

`role.toml` gives a RolePack a stable identity and reviewable boundaries.

The preview metadata convention is intentionally small. It should be enough for
humans and validators to understand a role without locking the final schema too
early.

## Minimal Example

```toml
schema = "agent-role/preview-0.1"
id = "agentroles.archi"
name = "Architecture Reviewer"
version = "0.1.0"
description = "Reviews architecture boundaries, coupling, and maintainability."
license = "Apache-2.0"

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
- `version`: role package version.
- `description`: short role summary.
- `license`: role package license.
- `identity.purpose`: why the role exists.
- `identity.responsibilities`: what the role owns.
- `identity.non_goals`: explicit boundaries.

## Optional Preview Fields

Preview roles may add sections for:

- `contents`: role-contained memory, skills, prompts, tools, plugin content,
  adapter notes, and tests.
- `permissions`: declared needs, not automatic grants.
- `adapters`: host-specific metadata.
- `maintainers`: role maintainers or review owners.

Optional fields are advisory in the preview. They should be reviewable and
host-neutral unless placed under a host-specific adapter section.

## Identity Rule

The role id is not the same thing as the mounted agent instance name.

A RolePack may recommend a display or instance name, but hosts decide how role
instances are named in their own runtime.
