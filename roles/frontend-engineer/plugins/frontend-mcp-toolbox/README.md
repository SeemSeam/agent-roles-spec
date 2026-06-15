# Frontend MCP Toolbox

This directory contains template content that compatible Host Adapters may use
when projecting frontend MCP tools through provider-shared runtime and
project-private binding.

It is not a live MCP configuration directory. Do not store installed packages,
generated MCP config, auth tokens, selected Figma files, browser profiles,
screenshots, traces, AGY worktrees, logs, or package caches here.

`mcp.json.template` intentionally uses placeholder commands and environment
references. A Host Adapter must resolve concrete packages, commands, and
runtime paths according to its own capability profile and Project Binding.
