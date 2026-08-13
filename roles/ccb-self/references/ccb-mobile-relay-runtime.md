# CCB Mobile And Relay Runtime

Use this reference for Mobile host, route, pairing, device, and Relay
maintenance. The Mobile host is server-wide state; a project pane is not its
authority.

## Commands

```bash
ccb install mobile
ccb update mobile
ccb mobile serve --route-provider <lan|tailnet|cloudflare_tunnel|relay>
ccb mobile devices
ccb mobile revoke <device_id>
ccb relay host activate [options]
ccb relay invite issue|status|list|revoke [options]
ccb relay host status|list|revoke [options]
```

Confirm detailed flags with `ccb <command> --help`. Invitation issuance and
host activation may require operator-owned configuration or an invitation file;
never request secret values in chat.

## Authority And Evidence

- Authority: the managed Mobile host service record, its current generation,
  CCB-owned listen endpoint, pairing store, and activated Relay host identity.
- Evidence: sanitized command output, `/v1/health`, process ownership checks,
  service logs, registered running projects, route diagnostics, and capability
  negotiation results.
- Residue: stale service records, expired pairing handoffs, stopped project
  registry entries, old endpoint markers, and dead non-current processes.

Do not publish credential paths, invitations, device secrets, tokens, or raw
Provider responses. Paths may be reported only when sanitized and needed for a
local operator action.

## Safe Maintenance Order

1. Identify whether the problem is host startup, route reachability, pairing,
   device authorization, project discovery, terminal transport, or Provider
   control capability.
2. Read current service and route status without rotating or revoking state.
3. Verify the endpoint belongs to the CCB-managed host before replacing it.
4. Use `ccb update mobile` for safe host replacement or pairing rotation when
   the installed release supports it.
5. Revoke exactly one device, invitation, or host only with explicit user
   intent and an exact identifier.
6. Recheck health, project discovery, and negotiated capabilities.

## Capability Boundary

Provider settings shown in Mobile are a projection of host authority.
Configured, active, and pending values are distinct. Model/thinking changes are
validated on the host and may require guarded Agent restart. Relay must
advertise the relevant capability; an older host should yield update guidance,
not a guessed or forced mutation.

## Native Windows Boundary

On native Windows, use platform-owned process/registry/TCP descriptor and
endpoint-marker checks. Herdr namespace and launcher state are not tmux state.
Do not use Unix process parsing or raw tmux commands as substitutes.
