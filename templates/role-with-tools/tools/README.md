# Tool Documentation

Document tools here.

Recommended sections:

- purpose
- install
- doctor
- update
- expected environment variables
- safety notes

The preview template does not execute tools. This directory is not an execution
manifest and does not grant permission for a host to run commands automatically.

For role-private MCP or CLI tools, add a TOML manifest such as
`tools/mcp-tools.toml` and list it in `contents.tool_manifests`. Host Adapters
must still ask for approval or follow Project Binding before installing or
running tools.
