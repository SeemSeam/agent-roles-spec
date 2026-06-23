# SU-CCB Role Provenance

This Role packages source content from SU-CCB repositories maintained by Sue.

## Claude Coordinator Source

- Repository: `https://github.com/Im-Sue/su-ccb-claude-plugin`
- Branch inspected: `main`
- Commit packaged: `6607c74e49bc2f79e1a63301d9615c81c9f0a2f9`
- Tag at packaged commit: `v1.2.0`
- Plugin manifest version: `1.2.0`
- Declared license: `MIT`
- Packaged content: Claude-side `skills/`, `lib/`, `references/`,
  `templates/`, `scripts/`, and plugin metadata.

## Codex Executor Source

- Repository: `https://github.com/Im-Sue/su-ccb-codex-skills`
- Branch inspected: `main`
- Commit packaged: `646cf721e15624a207b4c59089b491e45b24587d`
- Tags at packaged commit: `v1.1.0`, `v1.2.0`
- Declared license: `MIT`
- Packaged content: `skills/ccb-execute` and `skills/ccb-doc`.

## Packaging Notes

The source plugin marketplace installation command is runtime/user
configuration. It is not stored as installed state in this Role. The Role
carries reviewable source content and adapter notes; actual plugin
installation, projection, mount, and unmount behavior belong to host adapters
and Project Binding.
