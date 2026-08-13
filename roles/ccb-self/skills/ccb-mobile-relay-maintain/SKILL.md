---
name: ccb-mobile-relay-maintain
description: Diagnose and safely maintain the CCB Mobile host service, LAN/tailnet/Cloudflare Tunnel/Relay routes, pairing and devices, Relay invitation or host activation, multi-project terminals, and capability-negotiated Provider controls. Use when Mobile cannot connect, pair, discover projects, open terminals, expose Provider controls, or when a user explicitly asks to activate, update, revoke, or repair a CCB Relay host or device.
---

# CCB Mobile Relay Maintain

Read `references/ccb-mobile-relay-runtime.md` before mutation. Keep the Mobile
host's server-wide authority separate from project runtime and Pane evidence.

## Safety Rules

- Never read, print, store, or request Relay credentials, invitation secrets,
  device secrets, Provider credentials, or raw Provider responses in chat or
  Role memory.
- Diagnose before replacing the host or rotating pairing state.
- Revoke only one exact device, invitation, or host after explicit user intent.
- Do not infer Mobile host health from a project Pane or `.ccb/agents/*`.
- Do not force Provider controls when capability negotiation says unsupported;
  report the required host update.

## Workflow

1. Classify the incident:
   - host service not running or unhealthy;
   - LAN/tailnet/tunnel/Relay route unreachable;
   - pairing handoff expired or unclaimable;
   - device unauthorized or intentionally revoked;
   - running project not discovered;
   - host or project terminal transport failed;
   - Provider controls hidden, rejected, or pending restart;
   - native Windows registry, endpoint, TCP descriptor, or readiness mismatch.
2. Collect sanitized evidence with the smallest applicable commands:

```bash
ccb mobile devices
ccb relay host status <host_id>
ccb relay host list
ccb relay invite status <invite_id>
```

   Use local health and managed-service diagnostics when available. Do not
   expose secret-bearing files or arguments.
3. Verify the active service generation, CCB ownership of the listen endpoint,
   selected route provider, registered projects, and advertised capabilities.
4. Choose the least disruptive supported action:
   - `ccb update mobile` to refresh the server-wide host or rotate an expired
     pairing handoff;
   - `ccb mobile revoke <device_id>` for one explicitly selected device;
   - `ccb relay host activate ...` only from an operator-provided invitation or
     invitation file already available through the authorized workflow;
   - exact `ccb relay ... revoke` only for an explicitly selected identifier.
5. For Provider setting changes, distinguish configured, active, and pending
   state. Hand guarded post-config Agent restart to `ccb-self-recover` when the
   host says restart is required.
6. Verify health, route, project discovery, terminal connection, and capability
   negotiation after mutation.

## Native Windows

Use native Windows process ownership, registry, TCP descriptor, endpoint
marker, readiness, and Herdr namespace evidence. Do not apply Unix tmux or
`/proc` assumptions. If the current release reports beta prerequisites or an
unsigned launcher boundary, preserve that status in the report.

## Output

Report:

- incident class and current route;
- sanitized host generation/health evidence;
- project discovery and terminal status;
- capability status and any host-update guidance;
- exact mutation performed, if any;
- identifiers revoked without secret material;
- remaining platform or external-network blocker.
