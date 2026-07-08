# Open Design Tools

This Role carries Open Design source, not an installed runtime.

The vendored upstream repository contains the `od` CLI source, daemon, desktop
app, plugins, design systems, skills, and MCP documentation. A Host Adapter may
use `tools/open-design-tools.toml` to plan provider-shared or project-private
runtime projection, but concrete installation requires explicit approval.

Before treating a local shell command as Open Design, verify that `od` is not
GNU coreutils `od`. The Open Design CLI must come from an approved Open Design
runtime checkout or distribution.

Runtime setup may involve:

- Node `~24`;
- pnpm `>=10.33.2 <11`;
- package installation and native module builds;
- Open Design daemon or desktop lifecycle;
- `od mcp install <agent>` or equivalent adapter projection;
- plugin install/apply/trust state;
- local ports, generated artifacts, screenshots, traces, logs, and daemon data;
- provider or model credentials stored outside Role source.

See `references/open-design-runtime-readiness.md` for the required readiness
checks and failure interpretation.

Do not store generated MCP config, provider config, daemon state, plugin state,
package caches, screenshots, traces, or secrets in this Role.
