# CCB Runtime Flows

Use this reference to explain how CCB runtime behavior crosses CLI, ccbd,
dispatcher, message bureau, providers, and tmux evidence.

## Startup And Ownership

```text
project .ccb anchor
  -> config load
  -> keeper/lifecycle/lease
  -> ccbd generation
  -> mounted daemon graph
  -> configured agent runtime records
  -> tmux foreground windows/panes as evidence and UI
```

One `.ccb` anchor owns one authoritative backend generation. The keeper and
daemon lifecycle files define project ownership; old sockets, panes, provider
sessions, and `.ccb/agents/*` directories are evidence or residue.

## Ask And Reply

```text
CLI ask
  -> MessageEnvelope
  -> ccbd submit handler
  -> dispatcher submission
  -> JobRecord and queue state
  -> message bureau MessageRecord and AttemptRecord
  -> mailbox inbound event
  -> provider execution
  -> completion polling
  -> finalization
  -> ReplyRecord and reply delivery event
  -> watch, queue, inbox, trace, ack views
```

Key distinction: dispatcher queue state and mailbox/message-bureau state are
related but not identical. Use `ccb trace <id>` for lineage authority.

## Callback

`--callback` creates a persisted callback edge from parent to child work. The
child reply is not simply returned synchronously; completion records the child
reply and submits a continuation to the parent agent. Callback repair must
inspect callback edge state, message lineage, queue, and inbox progress.

## Provider And Pane Runtime

Provider panes, process ids, completion snapshots, logs, and provider session
files are evidence. They can prove stale, dead, mismatched, or progressing
state, but they do not define configured-agent authority by themselves.

Use text capture before screenshots. Screenshots are fallback visual evidence
for CCB-owned panes/windows only.

## Reload And Restart

`ccb reload` materializes disk config into the daemon graph. It does not prove
that an already-running provider process picked up new startup inputs.

After reload, re-check affected agents. Provider command, profile, model, base
URL, environment, role asset, workspace, or startup context changes may require
`ccb restart <agent>` for one affected current-graph agent at a time after busy
checks pass.

## Maintenance Heartbeat

Maintenance heartbeat is CCB-owned supervision/evaluation, not `ccb_self`
authority. `ccb_self` may assess or explain heartbeat findings when configured
as the semantic assessor, but daemon lifecycle remains outside the role.

## Diagnostic Order

1. Confirm project anchor and mounted daemon generation.
2. Read `ccb ps`, `ccb ping`, `ccb doctor`, queue, inbox, trace, and logs as
   needed.
3. Compare disk config only as desired state unless reload has succeeded.
4. Use pane/provider evidence to explain runtime behavior.
5. Choose the least disruptive CCB control-plane action.
