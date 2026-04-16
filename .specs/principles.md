# Project Principles

<!--
Read by every SpekLess skill on every invocation. Constrains plans, guides
execution, and gives /spek:verify concrete things to check against.

Keep principles concrete and testable. "Write clean code" is useless.
"Skill files must stay under ~300 lines" is useful.

Principles are sticky - they apply to every feature, not just one.
Feature-specific decisions belong in the feature's own spec.md Discussion section.
-->

## Code Style

- Skill files follow the standard sections convention: Inputs, Reads, Behavior/Actions, Writes, Output to user, Hard rules - in that order.
- Skill files stay under ~300 lines. If a skill file exceeds this, the skill is doing too much - split it or cut non-load-bearing prose.
- No linter, no formatter. Style is enforced by convention (see CLAUDE.md), not tooling.
- HTML comments (`<!-- ... -->`) are used as inline guidance in templates and spec files - never convert them to visible text.

## Architecture

- **Single-agent topology.** One main conversation drives everything. Sub-agents are context firewalls only: Explore for broad codebase reads, Plan for optional plan critique, general-purpose for fresh-lens verification. Never create a new agent role per workflow step.
- **Section ownership is strict.** Each section has exactly one write-owning skill that rewrites it idempotently. Checkbox-ticking by a downstream skill is the allowed narrow exception: `/spek:execute` ticks checkboxes in `## Plan -> ### Tasks`, and `/spek:verify` ticks checkboxes in `## Assumptions`.
- **The document is the state.** No STATE.md, no lockfiles, no checkpoint files. If you need to know where a feature is, read the spec sections.
- **Append-only execution log.** `execution.md` is never rewritten. Course corrections and plan revisions append new entries.

## Testing

- Manual smoke test only in v1 (see CLAUDE.md for procedure). No automated test suite.
- Before committing a non-trivial change, run at least steps 1-3 of the smoke test: create a scratch git repo, run `node install.js`, verify no `{{PLACEHOLDER}}` strings remain in generated files.

## Documentation

- `README.md` is the user-facing source of truth. `docs/architecture.md` is the contributor source of truth. When they conflict, update both.
- Architecture changes cascade: update `docs/architecture.md` first, then skills, then examples, then README.
- Examples in `examples/` are canonical output - not aspirational. Keep them in sync with what real workflow runs produce.
- When a skill is added, removed, or renamed, update every documented skill inventory and directory tree that enumerates the installed skill set, including the `README.md` "Directory layout inside a project using SpekLess" section. A rename is not just a text tweak: remove the old name from inventories and add the new name everywhere the installed skill set is listed.
- **During `/spek:plan`, always evaluate `docs/architecture.md`, `docs/maintenance.md`, and `docs/comparison.md` as candidate update targets.** Any spec that adds, removes, or significantly changes a skill, template, or the installer almost certainly requires updates to one or more of these files. Evaluate each one explicitly and add tasks for them - do not skip them silently or assume they are unaffected.

## Sync Rule

Whenever any file in `skills/` or `_templates/` is created, modified, deleted, or renamed, replicate the change to every installed copy that exists. Check for existence before syncing - do not create the directory if it is not already there. Running `node install.js` handles these sync cases automatically on re-run.

| AI Agent | Project-local | Global |
|---|---|---|
| Claude Code | `.claude/commands/{ns}/<skill>.md` | `~/.claude/commands/{ns}/<skill>.md` |
| Codex | `.codex/skills/{ns}-<skill>/SKILL.md` | `~/.codex/skills/{ns}-<skill>/SKILL.md` |
| OpenCode | `.opencode/commands/{ns}/<skill>.md` | `~/.config/opencode/commands/{ns}/<skill>.md` |

This sync is mandatory, not optional. A change to `skills/new.md` that is not reflected in the installed copy means the running skills and the source diverge.

**Sync is not a raw copy.** Syncing `skills/` or `_templates/` means applying the same render rules as `install.js`, not copying bytes verbatim.

Sync semantics by change type:
- **New skill:** create a new installed copy at the rendered target path for every existing install root. For Claude Code and OpenCode this is a new `{ns}:<skill>` flat command file; for Codex this is a new `{ns}-<skill>/SKILL.md` package directory.
- **Deleted skill:** remove the installed copy from every existing install root. For Claude Code and OpenCode delete the rendered flat command file; for Codex delete the entire `{ns}-<skill>/` package directory, not just `SKILL.md`.
- **Renamed skill:** treat it as delete old name + create new name. Do not leave the old rendered path behind. For Claude Code and OpenCode that means removing the old `<old-skill>.md` rendered command file and creating the new one; for Codex that means removing the old `{ns}-<old-skill>/` package directory and creating `{ns}-<new-skill>/SKILL.md`.

Render rules:
- Replace `{{CMD_PREFIX}}` in skill files with the correct agent prefix.
- Replace canonical source references `spek:<skill>` with the configured namespace for the target install.
- For Claude Code and OpenCode, render `spek:<skill>` as `{ns}:<skill>`.
- For Codex, render `spek:<skill>` as `{ns}-<skill>` and package each skill in its own `{ns}-<skill>/SKILL.md` directory.
- Render `_templates/` too. Template files are shared framework assets, but command references inside them still need namespace and agent rendering so generated docs do not point at the wrong command names.

## Command References

- `skills/` is the canonical source. Contributors author one source file per skill at `skills/<name>.md`; agent-specific packaged copies are derived at install and sync time.
- Skill source files use canonical `spek:<skill>` references in internal guidance, frontmatter, headings, and behavior text. Treat `spek` as a source token, not as a promise that installed copies will keep that literal spelling.
- Skill source files use `{{CMD_PREFIX}}spek:<skill>` in user-facing references such as Output to user and AskUserQuestion text. Never hardcode `/` or `$` in source skills.
- `_templates/` also use canonical bare `spek:<skill>` references when they mention commands. The installer renders those to the correct namespace form for the selected agent.
- When authoring a new skill, do not hand-create a Codex `SKILL.md` package in source. Create `skills/<name>.md` only and rely on installer rendering to generate:
- Claude Code installs `{ns}:<skill>` flat command files.
- OpenCode installs `{ns}:<skill>` flat command files.
- Codex installs `{ns}-<skill>` packaged skills.
- If you ever repair or sync Codex packages manually, write `SKILL.md` as UTF-8 without BOM. A BOM before `---` causes Codex to reject the YAML frontmatter as missing.
- Do not read `cmd_prefix` from `config.yaml` at runtime. Prefix and name rendering are install-time concerns.

## Security

- No secrets in skill files or templates. All per-project configuration lives in `.specs/config.yaml`.
- The installer uses `String.prototype.replace` for placeholder substitution - no `sed`, no delimiter issues. Values can contain any characters.
