# Hive Adapter Notes

Mount `agentroles.open-design` as `open-design`.

Hive may consume this Role as a wrapper around the vendored Open Design source.
Hive-specific projection, runtime installs, MCP config, provider state,
credentials, daemon data, generated artifacts, and cleanup records are host
runtime concerns.

The Role source should remain a static copy of upstream Open Design plus the
wrapper metadata and adapter notes.
