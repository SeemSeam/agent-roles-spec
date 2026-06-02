# Repository Structure

Date: 2026-06-02

## Proposed Shape

```text
agent-roles/
  README.md
  LICENSE
  CONTRIBUTING.md
  specs/
    role-v1.md
    metadata-v1.md
    host-adapters-v1.md
  schemas/
    README.md
  templates/
    basic-role/
    role-with-skills/
    role-with-tools/
    role-with-plugin-content/
  reference_roles/
    archi/
      README.md
      role.toml
      memory.md
      skills/
      prompts/
      tools/
      plugins/
      adapters/
      tests/
  host-adapters/
    claude-code/
      README.md
    codex/
      README.md
    ccb/
      README.md
    hive/
      README.md
  conformance/
    README.md
    valid/
    invalid/
  cli/
    README.md
```

## Ownership

- `specs/` is the authority for RolePack semantics.
- `schemas/` supports validation, but should not overtake the human spec
  before fields stabilize.
- `templates/` demonstrates how to start a role.
- `reference_roles/` demonstrates complete roles.
- `host-adapters/` documents host contracts; it should not contain full runtime
  implementations in v0.1.
- `conformance/` documents validation expectations and later becomes the
  compatibility test suite.
- `cli/` should be empty or documentation-only until the spec preview is
  stable.

## Role Directory Shape

A concrete role can contain:

```text
role/
  README.md
  role.toml
  memory.md
  skills/
  prompts/
  tools/
  plugins/
  adapters/
  tests/
```

Only the minimal metadata and at least one useful role content source should be
required in v0.1. The exact manifest shape can stay conservative until the
first schema stabilizes.
