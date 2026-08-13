# CCB Workflow Orchestration

Use this reference when `ccb_self` designs dynamic team workflows, assigns
mounted-agent lanes, or applies temporary orchestration memory overlays.

## Design Takeaways From External Patterns

Access date: 2026-06-16.

| Source | Authority | Inspected area | CCB design impact |
| --- | --- | --- | --- |
| OpenAI Agents SDK orchestration docs | official | handoffs vs agents-as-tools | Keep `ccb_self` as manager when it must synthesize; use handoff only when a specialist owns a branch. |
| OpenAI Swarm README and archived cookbook | official / archived | lightweight agents, handoffs, context variables, routines | Treat orchestration as small routines plus handoff contracts; do not depend on Swarm runtime. |
| LangChain multi-agent docs | official | subagents, handoffs, skills, router, custom workflow tradeoffs | Use router/parallel consult when context isolation and parallelism matter; avoid multi-agent overhead for small tasks. |
| Anthropic multiagent sessions docs | official | coordinator, isolated threads, agent-scoped MCP/tool access, primary-thread events | Preserve per-agent context isolation; surface starts, finishes, blockers, and permission requests to the coordinator. |
| AutoGen mixture-of-agents and handoff docs | maintained | orchestrator/worker layers and event-driven handoff pattern | Use layered analysis -> synthesis -> review when multiple independent viewpoints are useful. |
| CrewAI process docs | maintained | sequential and hierarchical manager processes | Use a manager lane for task allocation and validation; avoid pre-assigning every task when evidence should drive routing. |
| qodex-ai multi-agent-orchestration skill | community | role separation, dependencies, handoff points, audit logging, adaptive workflows | Borrow only general ideas: explicit dependencies, structured messages, feedback loops, and human intervention points. |
| alirezarezvani claude-skills orchestration notes | community | solo sprint, deep dive, handoff, skill chain patterns | Keep skill chains as the lightest option; use multi-agent only when boundaries materially help. |

Do not copy third-party skill text. Use these sources as pattern evidence only.

Source locators:

- https://developers.openai.com/api/docs/guides/agents/orchestration
- https://developers.openai.com/cookbook/examples/orchestrating_agents
- https://github.com/openai/swarm
- https://docs.langchain.com/oss/python/langchain/multi-agent
- https://platform.claude.com/docs/en/managed-agents/multi-agent
- https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/mixture-of-agents.html
- https://microsoft.github.io/autogen/stable/user-guide/core-user-guide/design-patterns/handoffs.html
- https://docs.crewai.com/en/concepts/processes
- https://docs.crewai.com/en/learn/hierarchical-process
- https://github.com/qodex-ai/ai-agent-skills/blob/main/skills/multi-agent-orchestration/SKILL.md
- https://github.com/alirezarezvani/claude-skills

## Pattern Selection

Prefer the smallest pattern that satisfies the task:

| Pattern | Use when | CCB shape |
| --- | --- | --- |
| Skill chain | One mounted agent can complete the task with loaded skills. | Keep work with the current agent; no memory overlay. |
| Manager-owned worker calls | `ccb_self` must synthesize, dedupe, or enforce review gates. | `ccb_self` sends bounded `ccb ask --chain` tasks only for exact result dependencies and owns final synthesis. |
| Parallel consult | Independent analysis, options, or risk review can run concurrently. | Send compact briefs to multiple specialists; synthesize and dedupe. |
| Handoff | One specialist should own a branch or continue the user conversation. | Explicitly transfer ownership and return route; do not keep duplicate owners. |
| Pipeline | Work needs phase separation. | Analysis -> implementation -> review -> synthesis with gates between phases. |
| Adaptive rebalance | Agent is blocked, busy, or producing duplicate work. | Narrow scope, cancel/defer duplicate lanes, or reassign only after evidence. |

## Agent Lane Contracts

Every lane needs:

- lane name: analysis, architecture, implementation, review, QA, docs, or
  synthesis;
- owner agent and fallback agent;
- input artifacts and paths;
- forbidden changes;
- output contract;
- validation evidence;
- chain or silence policy;
- stop/ask conditions.

Avoid vague assignments such as "help with this". Prefer concise contracts:

```text
Agent: reviewer
Lane: review
Task: Review the diff for behavior regressions and missing tests.
Inputs: git diff, touched files, test output.
Must not: edit files.
Output: findings first, severity, file/line, impact, fix.
Return: chain continuation to ccb_self.
```

## Mounted-Agent Memory Overlay

Use mounted-agent memory overlays only when dispatch text alone is not enough,
for example when a workflow spans multiple turns and each agent must reload a
stable lane contract.

Preferred order:

1. Plain `ccb ask` brief for one-off work.
2. Project config or role binding change through `ccb-config` when topology is
   the real change.
3. Bounded per-agent orchestration overlay when the agent needs temporary lane
   instructions across turns.

Overlay rules:

- write to CCB-owned mounted-agent memory only after explicit user activation
  intent;
- never write into Role source;
- create one backup next to the edited memory file;
- preserve existing memory exactly outside the overlay block;
- include owner, task id, timestamp, expiry/removal condition, and return
  route;
- replace the existing block for the same task instead of appending duplicate
  blocks;
- remove or expire overlays when the workflow ends.

## Activation And Refresh

After changing config, role assets, skills, prompts, or mounted memory:

1. Validate current CCB state and config:

```bash
ccb config validate
ccb reload --dry-run
```

2. Run `ccb reload` only when the user intended materialization.
3. Check affected current-graph agents:

```bash
ccb ps
ccb queue --detail <agent>
ccb pend --inbox --detail <agent>
```

4. Restart only affected, idle, current-graph agents:

```bash
ccb restart <agent>
```

Never use raw tmux mutation as a substitute for CCB restart.

For autonomous CCB loops, prefer script-owned `ccb loop runner --auto` plus
PlanTask/topology/capacity state over hand-written memory overlays. `ccb_self`
may diagnose or repair the runtime lane, but the frontdesk/planner/orchestrator
Roles and script-owned artifacts remain business/workflow authority.

## Deduplication

Before dispatching or re-dispatching:

- compare target agents, lane, task id, and output contract;
- avoid sending the same implementation task to two agents unless the plan is
  explicit parallel exploration;
- if two agents return overlapping analysis, synthesize common findings once
  and preserve disagreements as review questions;
- cancel or defer only through supported CCB commands and only when the user
  intended maintenance.

## Dynamic Adjustment

Adjust the workflow when evidence changes:

- agent blocked: narrow the task, provide missing input, or reassign;
- agent busy: defer restart or dispatch to another explicitly selected agent;
- quality weak: insert review lane;
- implementation risk high: split analysis and execution;
- duplicate work: keep one owner and convert the other to review or cancel;
- user retargets: update the plan and return route explicitly.
