---
title: su-plan deprecation sample trace
scenario: user invokes /ccb:su-plan during the deprecation window
created: 2026-05-03
---

# Sample Trace: /ccb:su-plan Deprecated Alias

## User

```text
/ccb:su-plan

请规划一个小的文档迁移任务。
```

## Deprecation banner

> **[Deprecated]** 此 skill 在 v0.4 v1 起标记为 deprecated，请改用 `/ccb:su-flow`（参见 ADR-0010）。
> 旧入口将在 v0.4 v2 OR ≥90 天后移除（取较长者）。功能等价，运行时行为不变。

## Redirect hint

```text
此入口仍在 grace window 内可用，但新任务请改用 /ccb:su-flow。
```

## Skill trace

```yaml
entrypoint: /ccb:su-plan
redirect_to: /ccb:su-flow
deprecated_in: 0.4-v1
removed_in: 0.4-v2
```

The alias keeps the same thin-facade behavior for compatibility. It does not
change the canonical node manifests, and it does not replace dispatch, review,
or archive runtime skills.
