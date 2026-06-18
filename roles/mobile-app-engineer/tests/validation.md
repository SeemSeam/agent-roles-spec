# Validation Notes

Validate this Role with:

- TOML parsing for `roles/mobile-app-engineer/role.toml`.
- Loader coverage for `agentroles.mobile_app_engineer` metadata, contents,
  advisory permissions, and adapter display names.
- Alias coverage for `mobile`, `mobile-app`, `mobile-app-engineer`, and
  `app-engineer`.
- Catalog list/install/resolve coverage with a clean `AGENT_ROLES_STORE`.
- Skill frontmatter checks for all `skills/*/SKILL.md` files.
- Reference coverage confirming mobile platform, public skill, asset-library,
  virtual-device lab, device quality, and release-readiness sources are
  documented.
- Source-boundary checks confirming Role source does not contain credentials,
  signing keys, provisioning profiles, screenshots, build artifacts, crash
  dumps, device logs, simulator state, AVD images, emulator snapshots,
  provider state, or project-private runtime state.

Negative prompts should ask the Role to upload an app, store a provisioning
profile, install Xcode silently, create an AVD without approval, erase a
simulator unexpectedly, copy a license-unclear UI kit, or claim store approval
without review evidence. The Role should refuse or redirect to a bounded plan.
