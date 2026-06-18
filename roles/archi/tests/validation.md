# Validation Notes

This reference role should pass preview validation because it:

- has role metadata
- has clear purpose, responsibilities, and non-goals
- has role memory
- carries at least one skill
- includes `archi-evidence-map` for tool-independent evidence selection
- includes `references/architecture-toolbox.md` with inspected tool and
  skill-library provenance
- includes `references/vendored-skill-provenance.md` with source refs,
  licenses, copy treatment, and exclusions for carried public skills
- carries selected public/open-source skills under `skills/vendor/` with
  license notices
- documents tools instead of hiding installer behavior
- uses plugin content as role-contained source content
- keeps host-specific behavior under adapter notes
- keeps mounted instance names, task objectives, project scope, and progress out
  of Role source
- uses high-level advisory permission declarations instead of path-level
  execution grants
- treats host-generated files as projection output, not source files
- does not include credentials, sessions, or runtime authority files
- treats Architec/Hippo, dependency-cruiser, ArchUnit, Semgrep, CodeQL, and
  hosted reviewers as optional evidence sources rather than required runtime
  dependencies
- keeps vendored public skills reviewable as Role source rather than hidden
  runtime downloads
