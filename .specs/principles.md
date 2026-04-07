# Project Principles

<!--
Read by every SpekLess skill on every invocation. Constrains plans, guides
execution, and gives /spek:verify concrete things to check against.

Keep principles concrete and testable. "Write clean code" is useless.
"Skill files must stay under ~300 lines" is useful.

Principles are sticky — they apply to every feature, not just one.
Feature-specific decisions belong in the feature's own spec.md Discussion section.
-->

## Code Style

- Skill files follow the standard sections convention: Inputs, Reads, Behavior/Actions, Writes, Output to user, Hard rules — in that order.
- Skill files stay under ~300 lines. If a skill file exceeds this, the skill is doing too much — split it or cut non-load-bearing prose.
- No linter, no formatter. Style is enforced by convention (see CLAUDE.md), not tooling.
- HTML comments (`<!-- ... -->`) are used as inline guidance in templates and spec files — never convert them to visible text.

## Architecture

- **Single-agent topology.** One main conversation drives everything. Sub-agents are context firewalls only: Explore for broad codebase reads, general-purpose for fresh-lens verification. Never create a new agent role per workflow step.
- **Section ownership is strict.** Each skill owns exactly one section of `spec.md` and rewrites it idempotently. The only exception is `/spek:execute` ticking checkboxes in `## Plan → ### Tasks`. No other exceptions.
- **The document is the state.** No STATE.md, no lockfiles, no checkpoint files. If you need to know where a feature is, read the spec sections.
- **Append-only execution log.** `execution.md` is never rewritten. Course corrections and plan revisions append new entries.

## Testing

- Manual smoke test only in v1 (see CLAUDE.md for procedure). No automated test suite.
- Before committing a non-trivial change, run at least steps 1–3 of the smoke test: create a scratch git repo, run `install.sh`, verify no `{{PLACEHOLDER}}` strings remain in generated files.

## Documentation

- `README.md` is the user-facing source of truth. `docs/architecture.md` is the contributor source of truth. When they conflict, update both.
- Architecture changes cascade: update `docs/architecture.md` first, then skills, then examples, then README.
- Examples in `examples/` are canonical output — not aspirational. Keep them in sync with what real workflow runs produce.

## Security

- No secrets in skill files or templates. All per-project configuration lives in `.specs/config.yaml`.
- Values containing `|` break the installer's `sed` substitution (it uses `|` as the delimiter). Avoid `|` in installer prompt values, or strip it before substitution.
