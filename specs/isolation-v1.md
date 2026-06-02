# Isolation v1 Preview

Status: draft preview

## Purpose

Agent Roles aims for roles that can be mounted and removed without polluting
the user's global environment or a project's runtime authority.

This preview defines the source/projection boundary and forbidden state. It
does not implement a sandbox.

## Source Content

RolePack source content may include memory, skills, prompts, tools, plugin
content, adapter metadata, and tests.

Source content is reviewable and versioned with the role.

## Projection Output

A host adapter may generate host-native files from RolePack source content.
Those generated files should be traceable to the role and removable on unmount.

Examples of projection output may include:

- host-native skill files
- host-native agent or subagent files
- memory bundles
- command wrappers
- MCP configuration fragments
- role-contained plugin content copied or linked into a managed location

## Forbidden State

RolePacks must not carry:

- credentials
- API keys or auth tokens
- provider session logs
- provider conversation histories
- runtime pid files
- socket paths
- lifecycle records
- project-private runtime state

## Permission Declarations

Permission metadata in the preview is a declaration of role needs, not an
enforcement mechanism.

Host adapters may use permission declarations to decide whether a role can be
mounted safely, but the preview spec does not provide a complete permission
runtime.
