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
