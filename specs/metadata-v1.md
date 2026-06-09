# Metadata v1 Preview

Status: draft preview

## Purpose

`role.toml` gives a Role a stable identity and reviewable boundaries.

The preview metadata convention is intentionally small. It should be enough for
humans and validators to understand a role without locking the final schema too
early.

`role.toml` describes the Role itself, not a mounted instance. Project-specific
task objectives, mounted instance names, project scope, concrete permission
grants, and runtime progress belong outside the Role Definition.

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
- `version`: Role version. Use semver (`MAJOR.MINOR.PATCH`).
- `description`: short role summary.
- `license`: Role source license.
- `identity.purpose`: why the role exists.
- `identity.responsibilities`: what the role owns.
- `identity.non_goals`: explicit boundaries.

## Optional Preview Fields

Preview roles may add sections for:

- `contents`: role-contained memory, skills, prompts, tools, plugin content,
  and tests.
- `permissions`: high-level declared needs, not automatic grants.
- `adapters`: host-specific metadata.
- `maintainers`: role maintainers or review owners.

Optional fields are advisory in the preview. They should be reviewable and
host-neutral unless placed under a host-specific adapter section.

Preview roles may also include advisory identity posture fields:

- `identity.interaction_mode`: coarse collaboration posture such as
  `review-only`, `interactive`, or `autonomous`.
- `identity.initiates_actions`: whether the Role is expected to initiate
  commands, writes, or other active operations without being explicitly asked.

These posture fields are not enforcement mechanisms.

## Full Example With Optional Fields

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
interaction_mode = "review-only"
initiates_actions = false

[contents]
memory  = ["memory.md"]
skills  = ["skills/architecture-review"]
prompts = ["prompts/architecture-review.md"]
tools   = ["tools/README.md"]
plugins = ["plugins/archi-workbench"]

[permissions]
read_files  = true
write_files = false
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

## Purpose Rule

`identity.purpose` is role-level. It describes why the Role exists across tasks.
It must not encode a concrete user task, project progress, or session state.

Concrete task objectives belong to the request, Project Binding, mounted role
state, or host-owned runtime state.

## Permission Rule

Preview permission fields are advisory declarations. They help humans and host
adapters understand what a Role expects, but they are not automatic grants.

Keep v0.1 permission fields high-level. Do not use paths, commands, or tool
names as if they were executable authorization rules. Fine-grained effect and
tool semantics are future work.
