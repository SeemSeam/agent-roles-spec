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

## Explicitly Deferred

- registry or marketplace
- security sandbox
- complete permissions runtime
- full CLI implementation
- live mount/unmount runtime
- automatic hot reload across hosts
- CCB runtime extraction
- provider session management
