# Role Mother Tools

`mother` carries small local tools for repeatable Role authoring checks.

## Included Tools

- `scripts/inventory_external_source.py`: reads a local skill, plugin, prompt,
  tool, or workflow source tree and emits JSON inventory for source-ingest
  planning.

## Boundaries

These tools inspect local files only. They must not install packages, clone
repositories, fetch secrets, write provider homes, create host runtime state,
or mutate Role source by themselves.

Use their output as evidence for a blueprint gate. The tools do not approve a
Role for publication and do not replace human maintainer review.

Research briefs, candidate scorecards, Role blueprints, and evaluation reports
are template/schema artifacts rather than executable tools. They live in
`templates/` and `schemas/` so a host or maintainer can review them before any
scaffold is written.
