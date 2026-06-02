# CCB Adapter Contract Preview

This adapter contract describes how CCB may consume RolePacks.

CCB-specific behavior belongs in the CCB adapter and CCB runtime, not in the
core RolePack specification.

Examples of CCB-owned behavior include:

- role store
- provider-state projection
- reload behavior
- ask routing
- sidebar display
- daemon lifecycle

The Agent Roles repository should not extract or redefine CCB runtime behavior.
