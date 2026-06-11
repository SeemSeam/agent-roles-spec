---
name: ccb-expert-reference
description: Answer CCB architecture, source-location, command, config, communication, release, test-evidence, manual, and "where is this implemented" questions with source-backed evidence. Use when a user asks how CCB works, how to use a CCB feature, whether a CCB feature is planned/implemented/released, where to find code/tests/docs, or how talk1's CCB developer/user manuals apply.
---

# CCB Expert Reference

Use this skill for CCB knowledge work. Do not mutate runtime state from this
skill. If the question becomes diagnosis or recovery, hand off to the
maintenance skills after giving the source-backed answer.

## Evidence Order

Prefer evidence in this order:

1. Current local CCB source checkout, docs, tests, and plan-tree.
2. Role references under `references/`.
3. Talk1 manuals under `docs/manuals/` when present.
4. Git history and release notes.
5. Public upstream source at
   `https://github.com/SeemSeam/claude_codex_bridge` when the host allows
   network access or the user asks for upstream freshness.

When the current project is not a CCB source checkout, skip local source and
manual paths that are not present. Use role references first, then the public
upstream URL when network is available or the user asks for upstream freshness.

Never answer exact CCB behavior from memory alone when local source/docs/tests
are available.

## Reference Routing

Read only the references needed for the question:

- `references/ccb-project-index.md`: GitHub URL, local checkout rules, source
  versus runtime authority, and answer format.
- `references/ccb-manuals-index.md`: talk1 developer manual, user manual, and
  `ccb_self` expert guide chapter map.
- `references/ccb-source-map.md`: code ownership, source modules, contracts,
  and tests.
- `references/ccb-command-surface.md`: CLI commands, ask flags, config
  commands, roles/tools commands, diagnostics, and removed-command guidance.
- `references/ccb-runtime-flows.md`: startup, ccbd, ask/reply, mailbox,
  provider, reload, restart, heartbeat, and pane evidence flows.
- `references/ccb-role-and-config-system.md`: Role Pack loading,
  `.ccb/ccb.config`, topology, overlays, validate, reload, and restart impact.
- `references/ccb-release-and-test-gates.md`: planned versus implemented
  versus released status, source runtime validation, and test routing.
- `references/ccb-knowledge-refresh.md`: how to refresh role knowledge after
  source, manual, or release changes.

For config edits, switch to `ccb-config`. For runtime health, switch to
`ccb-self-diagnose`. For repair, switch to `ccb-self-recover`,
`ccb-self-chain`, or `ccb-comm-reply-recover`.

## Answer Workflow

1. Classify the question as usage, source location, architecture, command,
   config, communication, release status, runtime evidence, or manual lookup.
2. Read the smallest relevant reference index.
3. Search local source/docs/tests with `rg` when the answer depends on current
   implementation.
4. Distinguish these states:
   - documented contract
   - plan-tree intent
   - implemented in local clean tree
   - implemented in dirty local tree
   - tested
   - released
5. Cite concrete files, commands, tests, or manual chapters. Use repo-relative
   paths when possible.
6. Give the minimal command sequence or source reading path. State uncertainty
   when evidence is absent or stale.

## Output Shape

Use this shape for precise CCB answers:

```text
Answer: ...
Evidence: ...
Authority layer: source|contract|plan|live runtime|manual|release
How to verify: ...
Risk or caveat: ...
```

For short user-facing usage questions, keep the answer shorter but still cite
the key command or file when the user needs confidence.

## Red Lines

- Do not present planned work as implemented or dirty local changes as
  released.
- Do not treat provider panes, screenshots, pid files, or runtime residue as
  authority.
- Do not fetch, infer, store, print, or search for API keys or credentials.
- Do not use public web sources for provider secrets, free keys, or unrelated
  private material.
- Do not mutate `.ccb/ccb.config`, runtime state, mailbox state, tmux panes, or
  provider homes from this skill.
