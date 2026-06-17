---
name: ccb-clear-resume
description: "Diagnose and recover a CCB agent whose provider context is corrupted, stale, overloaded, or semantically off-track when the user wants more than a plain clear: clear the agent only after safety checks, reconstruct the active task context from CCB lineage/runtime evidence, and resume or resubmit the interrupted work with a compact handoff. Use for requests like \"clear this agent then restore its task\", \"context is broken but continue the current job\", \"repair talk1/worker context and inherit current state\", or \"after clear, recover the task\"."
---

# CCB Clear Resume

## Purpose

Recover an agent from bad provider context without losing the work it was doing.
This skill combines guarded context clearing with task reconstruction and
resubmission. It does not replace job-lineage repair, config reload, or runtime
restart.

## Safety Rules

- Use CCB control-plane commands only. Do not edit mailbox, lifecycle, provider
  session, runtime, tmux, or `.ccb/agents/*` authority files directly.
- Do not run raw tmux mutation. Pane capture is evidence only.
- Do not read provider credentials, API keys, auth stores, or unrelated private
  provider state.
- Do not clear a busy agent unless the active lineage is terminal, cancelled, or
  the user explicitly accepts losing in-flight provider context.
- Do not duplicate active work. If a valid job is still running, report that
  instead of clearing or resubmitting.
- If the issue is reply/callback/ack lineage, prefer `ccb repair ...` before
  context clear.

## Decision Tree

1. If the user only asks to clear context and no task recovery is needed, use
   `ccb clear <agent>` after busy checks.
2. If the user reports missing replies, queued work, callback not continuing, or
   incomplete jobs, first trace lineage and classify the communication issue.
3. If provider context is stale/corrupted and the user wants the task to
   continue, use the clear-resume workflow below.
4. If the provider process is dead, quota-blocked, or pane-stale after clear is
   not enough, hand off to guarded `ccb restart <agent>` only after busy checks.

## Clear-Resume Workflow

### 1. Identify target and work

Collect the agent name and any known `job_id`, `message_id`, `attempt_id`, or
`reply_id`. If no id is provided, inspect current mailbox state:

```bash
ccb queue --detail <agent>
ccb pend --inbox --detail <agent>
```

When an id is known, trace it:

```bash
ccb trace <id>
```

Record message id, attempt id, reply id, event state, job status, target agent,
and whether the lineage is active or terminal.

### 2. Check clear gates

Run these before clearing:

```bash
ccb ps
ccb queue --detail <agent>
ccb pend --inbox --detail <agent>
ccb fault list
```

Use `ccb doctor logs <agent>` and read-only pane capture only when provider or
pane evidence is needed. Treat pane text as evidence, not authority.

Stop and report blockers if the agent is unknown, busy, has queued work, pending
reply delivery, pending callback continuation, or active fault injection that
could affect the target.

### 3. Build the resume packet before clear

Create a compact task handoff from durable evidence, not from provider memory:

- original user request or current objective
- traced job/message/attempt/reply ids
- current terminal or active state
- completed changes and files touched
- tests/commands already run and their results
- review conclusions and blocking findings
- known risks, constraints, and next required action
- whether to retry, resubmit, or ask a fresh handoff

If a request or reply is artifact-backed, read the full artifact through CCB
evidence paths before summarizing. Do not rely on previews for decisions.

### 4. Clear provider context

Only after gates pass:

```bash
ccb clear <agent>
```

Then verify the agent returns to a usable idle state:

```bash
ccb ps
ccb queue --detail <agent>
ccb pend --inbox --detail <agent>
```

If clear fails or the agent remains stale/dead, do not fake recovery. Report the
blocker or proceed to guarded single-agent restart if the user intended runtime
maintenance and gates pass.

### 5. Resume the task

Choose the least disruptive continuation:

- Use `ccb repair retry <job_id|attempt_id>` when the same lineage should run
  again and the original job is still the right unit of work.
- Use `ccb repair resubmit <message_id>` when the old execution is stale but the
  original message remains the right request.
- Use a fresh `ask <agent>` when the task needs a curated handoff after context
  clear, the prior prompt was too large or wrong, or the work should continue
  from updated facts.

For fresh handoff, keep it compact and explicit:

```bash
command ask --compact <agent> <<'EOF'
Context was cleared. Continue from this recovered state:

Objective:
- ...

Lineage:
- job: ...
- message: ...
- previous status: ...

Current evidence:
- ...

Required next action:
- ...

Reply with completed changes, tests, blockers, and risks.
EOF
```

Submit once, then stop. Do not poll unless the user requested diagnostics.

### 6. Verify recovery

After a reply or terminal status arrives, verify:

```bash
ccb trace <new_job_or_old_message>
ccb queue --detail <agent>
ccb pend --inbox --detail <agent>
```

Confirm one of these:

- the recovered task completed;
- a fresh valid job is queued/running with no duplicate active path;
- the remaining blocker is external, such as quota, provider outage, or required
  user decision.

## Output Requirements

Report:

- clear gate evidence and whether clear was performed;
- exact task lineage used for recovery;
- the resume method selected: `repair retry`, `repair resubmit`, or fresh `ask`;
- new job id if a fresh task was submitted;
- what was preserved in the handoff;
- what remains unresolved.

## Common Cases

- **Context polluted but no active job**: build handoff, `ccb clear <agent>`,
  fresh compact `ask`.
- **Old job terminal incomplete and provider resume unsupported**: clear if
  context is stale, then fresh compact `ask` or `repair resubmit <message_id>`.
- **Reply exists but callback did not continue**: do not clear first; repair
  callback/ack lineage.
- **Provider quota exhausted**: clear does not fix quota. Report external
  blocker, retarget, or switch provider/profile through config/reload/restart.
- **Pane shows old unrelated prompt while CCB says idle**: clear-resume is
  appropriate after gates pass.
