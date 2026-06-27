# Capacity Boundary

`orchestrator-capacity` is the only V1 path from semantic orchestration into
dynamic CCB nodes. The skill calls `ccb loop capacity ensure/status/release`
and consumes returned JSON. It never edits project configuration or runtime
authority files directly.
Direct ccb reload, raw kill, tmux mutation, provider repair, and direct
`.ccb/ccb.config` writes are outside this role.

The loop runner, CCB CLI, and ccbd own whether requested capacity becomes a
runtime overlay, guarded reload, or a rejected blocker.
