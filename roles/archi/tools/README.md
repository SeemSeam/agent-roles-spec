# Tools

The core role does not require a host-specific tool runtime.

Architecture-analysis tools such as Architec and Hippo are optional host
capabilities. Any install, update, or diagnostic behavior must be explicit and
reviewable.

Host-specific tool hooks belong under the matching adapter directory. For
example, CCB-specific hooks live under `adapters/ccb/tools/` and are declared by
`adapters/ccb/adapter.toml`.
