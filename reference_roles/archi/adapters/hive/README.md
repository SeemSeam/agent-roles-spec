# Hive Adapter Notes

Hive may consume this Role through a Hive adapter.

The adapter should describe Hive's supported role surfaces and isolation model
without changing the core role source format.

If a Hive adapter mounts this Role, project-specific instance naming, scope,
permissions, interaction topology, and prompt additions belong in the adapter's
Project Binding representation, not in the Role source.

Generated Hive-native assets are projection output and must not be written back
into this Role source directory.
