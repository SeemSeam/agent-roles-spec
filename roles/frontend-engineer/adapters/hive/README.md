# Hive Adapter Notes

Hive may consume this Role through a Hive adapter.

The adapter should describe Hive's supported role surfaces, MCP behavior,
browser validation capability, tool-manifest behavior, and isolation model
without changing the core Role source format.

If a Hive adapter mounts this Role, project-specific instance naming, scope,
permissions, interaction topology, tool configuration, and prompt additions
belong in Project Binding, not Role source.

Generated Hive-native assets are projection output and must not be written
back into this Role source directory.
