---
name: browser-quality
description: Use to validate a running frontend with browser evidence: visual QA, responsive screenshots, accessibility snapshots, console/network issues, layout collisions, and LCP/INP/CLS performance risks.
---

# Browser Quality

Use this skill when a frontend surface can be run or inspected in a browser and
quality claims need evidence.

## Workflow

1. Start or identify the local or hosted UI only when the user or project
   context permits it.
2. Inspect the target surface across relevant desktop and mobile viewports.
3. Check for blank renders, broken assets, overlapping text, layout jumps,
   focus issues, console errors, network failures, and interaction breakage.
4. Use accessibility snapshots or equivalent browser evidence for nontrivial
   flows.
5. Escalate to Chrome DevTools performance tracing when LCP, INP, CLS, network,
   hydration, or main-thread risk matters.
6. Record what was verified and what remains unverified.

## Output

Return:

- browser surfaces and viewports checked
- findings ordered by severity
- evidence from screenshots, accessibility snapshots, console/network output,
  traces, or tests
- fixes made or recommended
- residual risk

Do not store screenshots, browser profiles, traces, or local runtime logs in
Role source.
