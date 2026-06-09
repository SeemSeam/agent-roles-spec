# Tools

The core Role has no host-neutral executable tools.

CCB-specific diagnostic helpers live under `adapters/ccb/tools/`. The preview
Role specification treats those files as source content; hosts decide whether
and how to execute them during mount/materialization or role doctor workflows.
