# Open Design Runtime Readiness

This Role carries Open Design source. It does not prove that the Open Design
runtime is installed, selected on PATH, running, or exposed through MCP.

## Current Vendored Snapshot

- Upstream repository: `https://github.com/nexu-io/open-design`
- Vendored source ref: `f24bda9c97cf80a7d95c118ea7a5bbcdfe69f30d`
- Vendored `package.json` version: `0.12.1`
- Vendored package manager: `pnpm@10.33.2`
- Vendored engine requirements: Node `~24`, pnpm `>=10.33.2 <11`

As of the 2026-07-08 source check, upstream Open Design public releases list
`open-design-v0.13.0` as latest. This Role must not claim to include every
latest Open Design capability until the vendored source is refreshed and
source ingestion is rerun.

## Readiness Checks

Before saying Open Design can execute locally, check:

1. `node --version` satisfies upstream `engines.node`.
2. `pnpm --version` satisfies upstream `engines.pnpm` or Corepack is ready to
   provide the package manager declared in `package.json`.
3. `command -v od` resolves to an Open Design CLI, not GNU coreutils `od`.
4. Dependencies are installed in a Host Adapter or user-approved runtime
   directory outside Role source.
5. The Open Design daemon or desktop app is actually running when a daemon,
   preview, file, or project operation is requested.
6. MCP tools are exposed by the active provider session before using Open
   Design MCP. A template such as `plugins/open-design-claude/mcp.json` is not
   proof that MCP is installed.

## Runtime Plan Boundary

If checks fail, return a setup plan rather than pretending execution is ready.
The plan should name:

- install root outside Role source;
- Node and pnpm selection;
- dependency install/build command;
- Open Design CLI path and PATH strategy;
- daemon or desktop lifecycle;
- MCP dry-run command such as `od mcp install codex --print` when supported by
  the selected runtime;
- provider config target and approval boundary;
- cleanup and update ownership.

Generated dependency trees, daemon data, MCP config, provider config, logs,
screenshots, traces, local projects, and credentials are runtime or Project
Binding state. They do not belong in this Role.
