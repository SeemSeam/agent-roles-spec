# Claude CCB Plugin Content

This directory carries a source snapshot of the Claude plugin metadata from
`su-ccb-claude-plugin`.

- `plugin.json`: Claude plugin manifest metadata.
- `marketplace.json`: marketplace metadata from the source repository.

The native Claude plugin source used `.claude-plugin/`. In this Role, the files
are kept under a non-hidden Role source directory so they can be reviewed and
projected by host adapters. A Claude adapter may generate the native
`.claude-plugin/` shape as projection output during mount.
