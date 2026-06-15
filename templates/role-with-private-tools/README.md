# Role With Private Tools Template

Use this template when a Role wants to declare optional MCP servers, CLIs,
browser runtimes, or helper tools that a compatible Host Adapter can install
into a provider-shared runtime and activate through a project-private binding.

The key boundary is:

- Role source contains manifests, docs, templates, wrappers, and plugin source.
- Provider-shared runtime contains reusable installed packages, wrappers, and
  generated provider bridge or router files owned by the Host Adapter.
- Project Binding contains the current project's activation policy, enabled
  tools, resource allowlists, and project-specific URLs.
- Host runtime contains secrets, browser profiles, logs, screenshots, traces,
  and caches outside Role source.

This template is backwards-compatible with documentation-only tools. Hosts that
do not support `contents.tool_manifests` can still read `tools/README.md` and
ignore the machine-readable manifest.

## Contents

- `role.toml`: declares `contents.tools`, `contents.tool_manifests`, and
  optional plugin content.
- `memory.md`: tells the mounted role to treat tools as optional and explicit.
- `tools/README.md`: human-facing install, doctor, update, and safety notes.
- `tools/mcp-tools.toml`: machine-readable provider-shared tool declaration.
- `plugins/private-toolbox/`: adapter-projected template/plugin content.

## Runtime Rule

Do not install packages into this template directory. A Host Adapter that
supports this pattern should install reusable tools into a provider-shared
runtime store, write only lightweight activation data into the current
Project Binding, and remove adapter-owned projection output during unmount.
