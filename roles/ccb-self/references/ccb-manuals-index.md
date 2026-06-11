# CCB Manuals Index

Talk1 produced three CCB manual assets that `ccb_self` should use as expert
knowledge inputs when they are present in a local CCB source checkout.

## Manual Roots

- Developer manual source: `docs/manuals/developer-guide/`
- Developer manual local PDF: `docs/manuals/developer-guide/build/main.pdf`
- User manual source: `docs/manuals/user-guide/`
- User manual local PDF: `docs/manuals/user-guide/build/main.pdf`
- Role-facing expert guide: `docs/manuals/ccb-self-expert-guide.md`
- Manual planning and evidence: `docs/plantree/plans/ccb-manuals/`

The LaTeX sources are better for source-backed answers because they are
searchable and diffable. Use PDFs for human reading or release artifacts when
available.

## Use The Developer Manual For

- architecture layers and invariants;
- startup, keeper, ccbd lifecycle, supervision, reload, restart, and kill;
- state, storage, authority, provider runtime, completion, and session
  isolation;
- communication internals, ask, dispatcher, message bureau, mailbox,
  callbacks, reply delivery, retry, resubmit, cancel, and artifacts;
- config loader, role loading, CLI diagnostics, extension, tests, source maps,
  reliability, and glossary.

Common chapter paths:

- `docs/manuals/developer-guide/chapters/01-architecture.tex`
- `docs/manuals/developer-guide/chapters/02-startup-lifecycle.tex`
- `docs/manuals/developer-guide/chapters/03-state-storage.tex`
- `docs/manuals/developer-guide/chapters/04-communication.tex`
- `docs/manuals/developer-guide/chapters/05-provider-runtime.tex`
- `docs/manuals/developer-guide/chapters/06-config-roles.tex`
- `docs/manuals/developer-guide/chapters/07-cli-diagnostics.tex`
- `docs/manuals/developer-guide/chapters/08-testing-extension.tex`
- `docs/manuals/developer-guide/chapters/09-code-map-hotspots.tex`
- `docs/manuals/developer-guide/chapters/10-recovery-reliability.tex`
- `docs/manuals/developer-guide/chapters/11-test-map.tex`
- `docs/manuals/developer-guide/chapters/12-glossary-invariants.tex`

## Use The User Manual For

- concepts and user-facing mental model;
- `.ccb/ccb.config` examples and supported syntax;
- roles, tools, command reference, ask workflows, diagnostics, maintenance,
  FAQ, and operational recipes.

Common chapter paths:

- `docs/manuals/user-guide/chapters/01-concepts.tex`
- `docs/manuals/user-guide/chapters/02-configuration.tex`
- `docs/manuals/user-guide/chapters/03-roles-tools.tex`
- `docs/manuals/user-guide/chapters/04-command-reference.tex`
- `docs/manuals/user-guide/chapters/05-communication-workflows.tex`
- `docs/manuals/user-guide/chapters/06-diagnostics-maintenance.tex`
- `docs/manuals/user-guide/chapters/07-faq.tex`
- `docs/manuals/user-guide/chapters/08-recipes.tex`

## Use The Expert Guide For

- `ccb_self` role mission and boundaries;
- authority hierarchy and source-checking behavior;
- config expertise, command expertise, communication logic, diagnostic ladder,
  recovery playbooks, source map, checklists, and knowledge refresh.

Path:

- `docs/manuals/ccb-self-expert-guide.md`

## Manual Selection

- User asks "how do I use it" -> user manual plus command/config source.
- User asks "how does it work internally" -> developer manual plus source.
- User asks "what should ccb_self do" -> expert guide plus role references.
- User asks "is this implemented" -> source, tests, git, and release gates
  before manuals.
