# CCB Loop Orchestrator Validation

Validate this role by mounting it in a CCB project with:

- a durable `orchestrator` agent;
- `[loop.capacity]` enabled;
- `loop.role_profiles.worker` configured;
- `loop.role_profiles.code_reviewer` configured.

Expected behavior:

- The role uses `ccb loop capacity ensure/status/release --json`.
- It uses generated agent names returned by CCB, not hard-coded names.
- It sends bounded worker and reviewer asks.
- It releases loop-owned idle capacity after the round drains.
- It does not run raw `ccb reload`, raw `ccb kill`, tmux mutation, provider
  repair, or direct `.ccb/ccb.config` / `.ccb/runtime` writes.

Current CCB source validation:

```bash
cd /home/bfly/yunwei/test_ccb2
CCB_ORCH_SMOKE_RUN_REAL=1 \
python /home/bfly/yunwei/ccb_source/scripts/orchestrator_capacity_semantic_smoke.py \
  --test-root /home/bfly/yunwei/test_ccb2 \
  --project-name orchestrator-capacity-autonomous-repeat-smoke \
  --provider codex \
  --provider-home-mode real-home \
  --loop-id rep \
  --repeat 3 \
  --reset \
  --run-autonomous \
  --json
```

