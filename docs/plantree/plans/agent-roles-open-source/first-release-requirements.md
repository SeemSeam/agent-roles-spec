# First Release Requirements

Date: 2026-06-02

## Target

Release `v0.1.0-spec-preview` of `agent-roles` as a public GitHub repository.

The release should be credible as a specification preview, not as a complete
role manager. It must clearly say that CLI, mount runtime, registry, and full
host adapters are future work.

## Required Artifacts

- `README.md`
  - explains "from skills to roles"
  - explains "from scattered skills/plugins to managed roles"
  - states that Agent Roles starts with the specification
  - states that CLI and runtime adapters come later
  - describes Role as the central artifact
- `LICENSE`
  - recommended: Apache-2.0 for an ecosystem/specification project
- `CONTRIBUTING.md`
  - role PR expectations
  - no secrets, credentials, provider sessions, or runtime state
  - clear role purpose, responsibilities, and boundaries
- `specs/role-v1.md`
  - role source shape
  - content categories
  - host-neutral boundaries
  - source/projection boundary
  - forbidden state
- `specs/metadata-v1.md`
  - minimum role metadata fields
  - optional adapter metadata
  - no hard-coded manifest field commitments beyond v0.1 needs
- `specs/host-adapters-v1.md`
  - host, adapter, harness, mount, and unmount definitions
  - Claude Code, Codex, CCB, Hive adapter contract placeholders
- `templates/`
  - `basic-role`
  - `role-with-skills`
  - `role-with-tools`
  - `role-with-plugin-content`
- `reference_roles/`
  - at least one publisher-neutral role example
- `host-adapters/`
  - Claude Code README
  - Codex README
  - CCB README
  - Hive README
  - each adapter README must be contract-level, not runtime implementation
- `conformance/`
  - minimal valid and invalid fixtures or a documented checklist

## README Acceptance Criteria

- First screen identifies the project as a host-neutral Role specification.
- First screen contains the developer/user contrast:
  - developers: from skill development to role development
  - users: from scattered skills/plugins to managed roles
- The README uses `mount` rather than ambiguous "injection" wording.
- The README does not describe plugins as export targets.
- The README says concrete roles may contain plugin content.
- The README does not promise all hosts support instant hot reload.
- Claude Code, Codex, CCB, and Hive are presented as planned hosts/adapters,
  not as assumptions baked into the core spec.

## Spec Acceptance Criteria

- Role is described as a portable source definition for one specialist agent.
- A role may carry:
  - identity and responsibilities
  - memory
  - skills
  - prompts
  - tool scripts and documentation
  - plugin content
  - MCP configuration or examples
  - adapter metadata
  - tests
- The spec forbids:
  - credentials
  - secrets
  - provider sessions
  - runtime authority files
  - mounted instance state, progress, traces, and project binding state
  - project-specific private state
  - hidden installer behavior in memory or prompt text
- The spec distinguishes:
  - core Role source content
  - Project Binding and mounted role state
  - projection output
  - host adapter behavior
  - future runtime management
- Permission declarations are high-level advisory needs, not automatic grants.

## Reference Role Acceptance Criteria

- Uses a publisher-neutral id or neutral directory name.
- Includes a README, role metadata, memory, at least one skill or explicit
  no-skill rationale, and tests or validation notes.
- Does not rely on CCB-specific store/projection/reload behavior.
- May include host-specific examples under adapter folders.
- Demonstrates plugin content as role content when useful, without making
  plugins the root abstraction.

## Release Non-Requirements

The first release does not need:

- package publishing to PyPI/npm
- complete JSON schema
- working mount/unmount CLI
- live Claude Code or Codex integration
- CCB migration
- Hive runtime integration
- registry, signatures, or marketplace
- sandboxed installer execution

## Release Gate

The v0.1 release is ready when a new reader can answer these questions from
the repository without private context:

1. What is Agent Roles?
2. What is a Role?
3. Why is role development different from skill development?
4. How does role management simplify scattered skills/plugins?
5. What is in scope for v0.1?
6. What is explicitly deferred?
7. How should someone contribute a new role?
