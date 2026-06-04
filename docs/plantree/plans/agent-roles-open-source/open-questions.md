# Open Questions

Date: 2026-06-02

## Questions

1. What should the first reference role be named?
   - Candidate: `agentroles.archi`
   - Constraint: avoid making `ccb.archi` the primary public identity.

2. Should the first release include a generated JSON schema, or only a
   human-readable metadata convention plus validation checklist?
   - A schema improves credibility.
   - A checklist avoids premature field lock-in.

3. How much Claude Code and Codex behavior should be described in v0.1 adapter
   docs?
   - Need enough to prove compatibility direction.
   - Avoid promising exact runtime behavior before implementation.

4. Should the v0.1 repository include a CLI skeleton?
   - A skeleton helps users see future direction.
   - It may distract from the spec-first release.

5. What is the right English wording for the Chinese "降临" concept?
   - `mount` is the stable technical verb.
   - "descend" can appear in marketing copy, but should not replace `mount` in
     specs or CLI naming.

6. Should hosts call `agent-roles` through subprocess JSON, a Python library,
   or both?

7. Should tool dependency state live under `.roles/tools`, or remain host-owned
   because execution policy is host-specific?

8. Should the default store path stay `~/.roles`, or should XDG data paths be
   the default with `~/.roles` as a user-facing alias?

## Resolved

- The first reference role uses `agentroles.archi` as its public role id;
  `ccb.archi` is a legacy alias, not the primary public identity.
- The v0.1 repository now includes a small package-management CLI, not the full
  future mount/unmount runtime.
