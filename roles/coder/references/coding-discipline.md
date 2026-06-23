# Coding Discipline Reference

Access date: 2026-06-23.

This reference records the research basis for `agentroles.coder`. The Role is
kept lightweight: it synthesizes implementation discipline instead of vendoring
large third-party skill packs.

## Research Brief

- Goal: constrain implementation agents so they write small, repo-native,
  test-backed code without scope creep, large-file growth, or silent fallback
  behavior.
- Target hosts: Codex, Claude Code, CCB, Hive.
- Non-goals: formal code review, architecture audit, security audit, release
  publication, product strategy, or frontend/mobile specialization.
- Copy decision: no third-party skills are copied into this Role in v0.1.0.

## Inspected Sources

| Source | Authority | What was inspected | Design impact |
| --- | --- | --- | --- |
| OpenAI Codex manual | official | best practices, prompting, `AGENTS.md`, skills, hooks, rules, and review guidance | Use layered constraints: role memory for posture, skills for workflows, templates for outputs, hooks/rules as optional host enforcement. |
| `agents.md` | maintained | examples and recommended sections for coding-agent guidance | Keep project guidance concrete: setup, tests, style, security, PR instructions, and nested overrides. |
| `addyosmani/agent-skills` | maintained/community | incremental implementation, TDD, source-driven development, code simplification, code review, and quality gates | Synthesize small-slice implementation, proof through tests, no speculative abstractions, and self-checking output. |
| `mattpocock/skills` | maintained/community | implement, TDD, codebase design, improve-codebase-architecture, git guardrails | Borrow deep-module and public-interface testing vocabulary while leaving architecture review to `archi`. |
| `awesome-skills/code-review-skill` | community | progressive disclosure, multi-language review references, severity labels, large-diff triage | Do not vendor by default because it is review-oriented and large; keep formal review outside `coder`. |
| OpenAI `skills` repository | official/community example | curated `gh-fix-ci`, security, Playwright, and goal skills; repository deprecation note | Borrow CI-fix and verification patterns, but avoid depending on the deprecated repo as a source package. |
| VS Code Agent Skills docs | official | progressive loading and shared-skill review/customization guidance | Keep each `coder` skill focused and lightweight. |

## Candidate Decision

| Candidate | Treatment | Reason |
| --- | --- | --- |
| Lightweight synthesized coder skills | selected | Best fit for focused implementation and source-boundary cleanliness. |
| `addyosmani/agent-skills` full lifecycle pack | referenced only | Useful but too broad for a narrow coder Role. |
| `mattpocock/skills` engineering pack | referenced only | Valuable design vocabulary, but several skills are planning or architecture oriented. |
| `awesome-skills/code-review-skill` | rejected for default coder | Strong review pack, but review belongs to reviewer or `archi`; full pack is too large. |
| OpenAI curated skills | referenced only | Useful patterns, but official repo is deprecated for current distribution. |

## Design Rules

- Prefer instructions and templates over scripts for v0.1.0.
- Keep formal review and architecture findings out of `coder`.
- Trigger source/documentation checks only when current API correctness matters.
- Treat dependency changes, migrations, CI changes, and destructive git as
  approval-gated.
- Make final output evidence-oriented: changed files, verification, residual
  risk, and escalation target.
