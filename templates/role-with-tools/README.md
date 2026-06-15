# Role With Tools Template

Use this template when a role documents explicit tool scripts or external tool
requirements.

The preview template treats `tools/` as source documentation and reviewable
notes. It does not grant hosts permission to execute commands automatically.

If a role needs machine-readable MCP or private-tool declarations, use
`contents.tool_manifests` and the
[role-with-private-tools](../role-with-private-tools/) template. The older
`tools/README.md` documentation-only pattern remains valid.
