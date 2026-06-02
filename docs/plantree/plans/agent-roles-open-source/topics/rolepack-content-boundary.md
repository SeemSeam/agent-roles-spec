# RolePack Content Boundary

Date: 2026-06-02

## Purpose

Define what a RolePack can carry for the first public specification preview.

## RolePack Contents

A RolePack may contain:

- role identity and responsibilities
- role memory
- skills
- prompts and templates
- tool scripts and tool documentation
- plugin content
- MCP configuration or examples
- host adapter metadata
- validation notes and conformance tests

The package should let a reviewer understand what the role is, what it carries,
what it needs, and how a compatible host may mount it.

## Plugin Content

Concrete role directories may include plugin content directly under the role.
The README should not frame plugins as export targets or external dependencies
by default.

For v0.1, it is enough to say that compatible hosts may project plugin content
into their native plugin/capability surfaces.

## Forbidden Content

A RolePack must not contain:

- credentials
- API keys or auth tokens
- provider sessions or conversation logs
- runtime pid, socket, pane, lifecycle, or completion authority files
- project-private state
- hidden installer behavior embedded in memory or prompt text

Tools and installer behavior must be declared and reviewable.

## Boundary

RolePack content is source content. Host-generated files are projection output.

The v0.1 spec should emphasize that generated assets must be traceable and
removable, but the first release does not need to implement the runtime that
performs projection cleanup.
