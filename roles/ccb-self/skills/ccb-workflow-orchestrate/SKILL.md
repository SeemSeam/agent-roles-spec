---
name: ccb-workflow-orchestrate
description: Plan and activate CCB multi-agent workflow orchestration from ccb_self. Use when the user asks to split work across mounted agents, assign analysis/implementation/review roles, adjust per-agent task memory, coordinate ask dispatch, deduplicate overlapping work, or reload/restart affected panes so new mounted-agent instructions are loaded.
---

# CCB Workflow Orchestrate

Use this skill to design and activate a CCB workflow across mounted agents
without turning `ccb_self` into the business-task owner. Keep manager ownership,
dispatch contracts, review gates, and runtime refresh decisions visible.

Read `references/ccb-workflow-orchestration.md` for orchestration patterns,
memory overlay rules, activation gates, and research provenance. Also use
`references/runtime-authority.md`, `references/ccb-command-surface.md`, and
`references/ccb-role-and-config-system.md` when commands or reload/restart
impact matter.

## Workflow

1. Inventory the live CCB state before planning:
   - `ccb ps`
   - `ccb queue --detail all`
   - `ccb pend --inbox --detail all`
   - `ccb config validate`
   - `ccb reload --dry-run` when config or role assets may be affected
2. Classify the user's goal:
   - analysis/research only;
   - implementation with separate review;
   - parallel exploration with synthesis;
   - recovery or rebalancing of an existing workflow;
   - temporary mounted-agent memory overlay and activation.
3. Choose the lightest orchestration pattern:
   - single-agent skill chain for small or low-risk work;
   - manager-owned worker calls when `ccb_self` must synthesize the final
     answer;
   - parallel consult lanes for independent analysis or design options;
   - handoff when one specialist should own a branch;
   - analysis -> implementation -> review pipeline for risky code changes.
4. Produce a plan before mutation:
   - agents and lanes;
   - task contract per agent;
   - inputs, forbidden changes, expected output, and validation evidence;
   - handoff and review gates;
   - dedupe rule for overlapping agents;
   - activation commands and restart risk.
5. If per-agent memory changes are necessary, write only bounded
   mounted-agent orchestration overlays:
   - target mounted-agent memory, not Role source;
   - create a backup first;
   - use a clearly delimited block with owner, timestamp, task id, expiry, and
     removal condition;
   - include role lane, task contract, communication contract, validation
     criteria, and return route;
   - do not store secrets, provider state, progress logs, or broad permanent
     policy changes.
6. Activate through CCB control-plane gates:
   - run validation after config-like edits;
   - run `ccb reload --dry-run` before `ccb reload`;
   - run `ccb reload` only when the user intended materialization;
   - restart only affected current-graph agents, one at a time, with
     `ccb restart <agent>` after busy checks pass.
7. Dispatch work through CCB:
   - use `ccb ask --chain <agent>` only when the parent cannot finish without
     the result;
   - use `ccb ask --silence <agent>` only for independent work where success
     result is not needed;
   - do not poll in the same turn unless the user asked for diagnostics.
8. Adapt after evidence:
   - compare replies against the plan;
   - deduplicate overlapping results;
   - add a review lane when quality or risk is uncertain;
   - reassign or narrow lanes when an agent is blocked, busy, or off-scope;
   - return business ownership to the original target agent.

## Memory Overlay Template

Use this shape for a temporary mounted-agent overlay:

```text
<!-- ccb-orchestrate:begin owner=ccb_self task=<id> expires=<condition> -->
Lane: analysis | implementation | review | synthesis | support
Mission: ...
Inputs: ...
Must not: ...
Output contract: ...
Validation evidence: ...
Communication: reply to ccb_self; use chain only when result is required
Return route: ...
Removal condition: ...
<!-- ccb-orchestrate:end -->
```

Keep overlays small. Prefer editing or replacing the existing
`ccb-orchestrate` block for the same task instead of appending duplicates.

## Red Lines

- Do not edit Role source memory to encode a project workflow.
- Do not overwrite an agent's base mounted memory.
- Do not edit lifecycle, lease, mailbox, provider session, pid, socket, or raw
  tmux authority files.
- Do not run raw tmux mutation or `restart-all`.
- Do not restart a busy, unknown, stale, or non-current-graph agent.
- Do not store credentials, API keys, auth state, provider sessions,
  screenshots, traces, or progress logs in memory overlays.

## Report

Report:

- selected orchestration pattern;
- agents, lanes, and task contracts;
- memory/config files changed or proposed;
- validation, reload, and restart commands run or blocked;
- dispatch commands submitted;
- review/synthesis result;
- cleanup or overlay removal follow-up.
