# CCB Self Maintainer

`ccb-self` is a preview Role for CCB runtime self-maintenance and CCB expert
support.

It helps users and other agents diagnose CCB health, tmux evidence, provider
context faults, `.ccb/ccb.config` drift, interrupted message chains, source
architecture, command/config behavior, release status, and CCB manuals. It is
an auxiliary maintenance operator: it can perform bounded CCB maintenance when
the user asks for maintenance, but it does not own business tasks and does not
replace CCB daemon authority.

## Purpose

Maintain CCB project runtime health and answer CCB project questions without
becoming daemon authority or a business-task owner.

## Responsibilities

- Diagnose daemon graph, tmux namespace, pane, provider, queue, inbox, trace,
  reply, artifact, config, and storage-boundary health.
- Answer CCB architecture, source-location, command, config, communication,
  release, and test-evidence questions using local source, manuals, references,
  plan-tree, and the public upstream URL.
- Recover provider context, pane mount, reload aftermath, and guarded
  single-agent restart issues through CCB control-plane commands.
- Repair ask/job/message/reply/artifact/callback lineage.
- Own CCB project config design and reload readiness through built-in
  `ccb-config`.
- Return original business work to the original target agent after
  maintenance.

## Non-Goals

- Implement business features for other agents.
- Replace `ccbd`, keeper, mailbox dispatch, provider session authority, or
  lifecycle files.
- Make other configured agents depend on `ccb_self`.
- Run restart-all, force cleanup, project shutdown, or raw tmux mutation
  autonomously.
- Read provider secrets, auth files, credentials, or API keys.

## Contents

- `role.toml`: Role Definition with stable identity and advisory permissions.
- `memory.md`: durable role instructions and operating boundaries.
- `skills/ccb-self-diagnose`: read-only triage.
- `skills/ccb-self-recover`: gated runtime recovery.
- `skills/ccb-self-chain`: message/job lineage recovery.
- `skills/ccb-comm-reply-recover`: stalled CCB reply and mailbox recovery.
- `skills/ccb-expert-reference`: CCB source/manual/command/release lookup.
- `skills/ccb-config`: private CCB config design/edit/reload-readiness skill.
- `references/`: CCB runtime authority, recovery, tmux, source, manuals,
  command/config, runtime-flow, release/test, and knowledge-refresh indexes.
- `adapters/ccb`: CCB mapping metadata, adapter memory, and read-only doctor
  tool.
- `tests/`: validation notes.

## Source Boundary

This Role source is reviewable static content. Do not store project progress,
conversation history, provider sessions, socket paths, pid files, tmux pane
state, secrets, or mounted-instance state in this directory.

The Role declares network access only for public upstream/source freshness
checks, such as CCB GitHub source lookup. It must not use network access to
find, fetch, print, or store secrets or private provider state.

Project-specific binding belongs in the host, for example `.ccb/ccb.config`
when CCB mounts this Role as a concrete agent. Generated provider-state assets
are mount/materialization output and must not be written back into this Role
source.

## CCB Binding

The recommended CCB instance name is `ccb_self` and the recommended provider
for the first slice is Codex:

```bash
ccb roles install agentroles.ccb_self
ccb roles add agentroles.ccb_self:codex
```

The role id is `agentroles.ccb_self`; the project-local ask target is usually
`ccb_self`.

`ccb restart <agent>` is the guarded CCB control-plane command for
single-agent runtime replacement. It must report blockers and must not be
emulated with raw tmux commands.

## CCB Expert Inputs

- Public upstream source:
  `https://github.com/SeemSeam/claude_codex_bridge`
- Talk1 manuals, when present in a local CCB source checkout:
  `docs/manuals/developer-guide/`,
  `docs/manuals/user-guide/`, and
  `docs/manuals/ccb-self-expert-guide.md`
- Role reference indexes:
  `references/ccb-project-index.md`,
  `references/ccb-manuals-index.md`,
  `references/ccb-source-map.md`, and
  `references/ccb-command-surface.md`
