# Plugin Distribution Version Matrix

> 当前主线为 **v1.0.0**（两层模型，ADR-0028 + ADR-0030）。下表 v0.5.0 行为历史快照：其 Epic 三层模型已完成退役，当前 kernel 不再保留实体级 Epic 协议。

| Plugin tag | Kernel schema | Task model | Console expectation |
|---|---|---|---|
| v1.0.0（current） | state-schema ADR-0028 two-tier / node-manifest ADR-0030 | Requirement -> SubTask（two-tier, ADR-0028） | Console v1.0 clean start（two-tier） |
| v0.3.3 | state-schema-v0.3.2 / node-manifest-v0.3.2 | Flat Task + seven canonical nodes | Console v0.4/v1 baseline |
| v0.5.0（历史） | state-schema-v0.5.0 / node-manifest-v0.5.0 | Requirement -> Epic -> SubTask | Console hierarchy feature branch M1-M4 |

## Compatibility

- v0.5.0 is a protocol upgrade. It is not compatible with consumers that assume every Task has a non-null seven-node `current_node`.
- v0.5.0 remains a v0.x minor bump because migration paths and legacy audit fields are part of the release.
- Console main should consume v0.5.0 only through the hierarchy feature branch compatibility gate.
