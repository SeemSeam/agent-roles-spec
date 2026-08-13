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

## Chain Continuation

`--chain` creates a persisted chain edge from parent to child work. The
child reply is not simply returned synchronously; completion records the child
reply and submits a continuation to the parent agent. Chain repair must inspect
edge state, message lineage, queue, and inbox progress. Some source/storage
internals retain `callback` compatibility names; user-facing guidance uses
`chain`.

`ccb followup` is separate: it attempts to inject a correction into one exact
active turn. Only an `injected` response changes that turn.

## Provider And Pane Runtime

Provider panes, process ids, completion snapshots, logs, and provider session
files are evidence. They can prove stale, dead, mismatched, or progressing
state, but they do not define configured-agent authority by themselves.

Use text capture before screenshots. Screenshots are fallback visual evidence
for CCB-owned panes/windows only.

Provider configuration is inherited per dimension and one-way into managed
homes. Conversation identity remains stable across authority generations;
prefer validated resume/fork/import or linked continuation over clearing.

On native Windows, Herdr namespaces and platform-owned process/registry/TCP
evidence replace tmux-specific assumptions. Cursor visible-pane execution also
requires transcript anchors, stable-idle checks, and terminal evidence.

## Mobile Host And Relay

The Mobile host is a server-wide managed service that discovers running CCB
projects and serves independent host/project terminals. Its service generation,
listen ownership, pairing store, route state, and negotiated capabilities are
authority/evidence distinct from any one project Pane. Relay invitations,
credentials, and device secrets remain private host state.

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
