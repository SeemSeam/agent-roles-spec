# Private Tool Notes

This template declares optional provider-shared tools. It does not install them
by itself and does not grant permission for a host to run commands
automatically.

## Lifecycle

- Install: explicit host action or Project Binding approval only; reusable
  packages should be installed into the provider-shared runtime.
- Doctor: check whether the Host Adapter projected the tool and whether
  required environment variables are supplied by runtime configuration.
- Update: explicit host action only.
- Project activation: write the current project's enabled tools and resource
  allowlists into Project Binding, not Role source.
- Uninstall: manager-side unmount removes adapter-owned projection and binding
  output when supported.

## Safety

- Do not store secrets or tokens in Role source.
- Do not write generated MCP config back into Role source.
- Do not commit package caches, browser profiles, logs, screenshots, or traces.
- Treat `store_hint` values in manifests as advisory, not permissions.
