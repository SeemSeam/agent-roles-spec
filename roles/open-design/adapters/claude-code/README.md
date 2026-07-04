# Claude Code Adapter Notes

Mount `agentroles.open-design` as `open-design`.

Claude Code may consume the wrapper memory, the wrapper skill, and the
vendored upstream Open Design skills. The upstream plugin content under
`upstream/open-design/plugins/` and `.claude-plugin` metadata are source
content until a Claude Code adapter explicitly projects them.

Generated Claude-native skills, plugin installs, MCP config, command wrappers,
credentials, provider sessions, and runtime data are projection output and must
stay outside Role source.
