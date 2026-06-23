# Hive Adapter Notes

Mount `agentroles.coder` as `coder`.

Hive may expose this Role as a focused implementation worker. Keep review,
architecture, orchestration, and release responsibilities outside this Role.
Project-specific bindings and generated runtime assets belong to Hive runtime
state, not Role source.
