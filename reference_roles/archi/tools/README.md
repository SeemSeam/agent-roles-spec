# Tools

The core role does not require a host-specific tool runtime.

Architecture-analysis tools such as Architec, Hippo, dependency-cruiser,
ArchUnit, Semgrep, CodeQL, and hosted PR reviewers are optional evidence
sources. Any install, update, or diagnostic behavior must be explicit and
reviewable.

Use `references/architecture-toolbox.md` and `archi-evidence-map` to decide
which evidence source fits the current repo. Direct source review remains the
fallback when optional tools are missing.

Vendored public skills under `skills/vendor/` are Role source, not external
tool installs. They can be projected by a Host Adapter as skills, but they
must not trigger hidden package downloads or provider-home mutation.

In the preview spec, this directory is source content for documentation,
runbooks, scripts, and lifecycle notes. It is not an execution manifest and does
not grant permission for a host to run commands automatically.

Host-specific tool hooks belong under the matching adapter directory. For
example, CCB-specific Architec hooks live under `adapters/ccb/tools/` and are
declared by `adapters/ccb/adapter.toml` as an optional evidence route.
