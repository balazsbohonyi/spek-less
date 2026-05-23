---
id: 032
title: Add support for Antigravity in SpekLess
status: done
part_of: SpekLess
starting_sha: dc62832
created: 2026-05-23
tags: []
---

# Add support for Antigravity in SpekLess

## Context

> Part of [**SpekLess**](../project.md).

SpekLess currently renders one canonical `skills/` source tree for Claude Code, Codex CLI, and OpenCode. Antigravity needs to become a first-class supported target in the installer, available through both interactive setup and a new `--antigravity` sync flag.

Antigravity uses slash-prefixed commands like Claude/OpenCode, but its skill package layout matches Codex: one directory per skill containing `SKILL.md`. With the default namespace, user-facing commands should render as `/spek-new`, `/spek-discuss`, `/spek-plan`, and so on. Project-local skills install under `.agents/skills/<namespace>-<skill>/SKILL.md`; global skills install under `~/.agents/skills/<namespace>-<skill>/SKILL.md`.

This feature also corrects global config handling across all supported agents. The installer should read/write each selected agent's own global SpekLess config only when global install scope is selected, while project `.specs/config.yaml` continues to win when present.

Post-completion discussion clarified the intended semantics of target-agent flags. `--claude`, `--codex`, `--opencode`, and `--antigravity` should behave as non-interactive install-or-sync commands for the selected agent: if the agent root already exists, refresh it; if it does not exist, create the selected agent's skill root and install rendered skills. Flag mode still preserves shared project assets such as `.specs/config.yaml` and `.specs/_templates/`.

<!--
Why this feature exists. The problem it solves, for whom, under what constraints.
Also: the goal / success criteria â€” what does "done" look like?
Written by spek:new (skeleton) or spek:discuss (filled in during conversation).
Stable once agreed; spek:discuss may refine it but rarely rewrites from scratch.
-->

## Discussion

The first decision was whether Antigravity should behave like Claude/OpenCode or Codex. It is a hybrid: command prefix is `/`, but command identity and on-disk packaging are Codex-style. That means source references such as `spek:new` should render to `spek-new` for Antigravity, and visible commands should render to `/spek-new`.

The installer must support Antigravity in both paths: the regular interactive agent-choice prompt and `node install.js --antigravity`. The target-agent flag is best understood as a non-interactive install-or-sync command, not a pure sync-only command. When the selected agent's project or global root already exists, the flag refreshes rendered skills there. When the root is absent, the explicit flag is enough user intent to create the selected agent's skill root and install rendered skills without asking interactive questions.

This resolves the ambiguity introduced by the earlier target-flag design. The original sync-only behavior made the four-command contributor sync recipe safe on machines without every agent installed, but it also meant `node install.js --antigravity` skipped project-local install entirely when `.agents/skills` was not already present. That is surprising for first-time target setup. The middle-ground decision is that target flags remain non-interactive and skills-only, but they create the selected agent's skill root when needed. They still preserve shared project assets such as `.specs/config.yaml` and `.specs/_templates/`, because a project can have multiple agent install roots but only one shared SpekLess spec/template configuration.

Cleanup semantics should match Codex. Because each skill is packaged as its own directory, deleted or renamed Antigravity skills remove the whole `<namespace>-<skill>/` directory rather than leaving stale `SKILL.md` packages behind.

Global configuration is agent-specific after this change. The agreed mapping is Claude Code `~/.claude/spek-config.yaml`, Codex `~/.codex/spek-config.yaml`, OpenCode `~/.config/opencode/spek-config.yaml`, and Antigravity `~/.agents/spek-config.yml`. There is no migration and no cross-agent fallback. Flag-mode reads project `.specs/config.yaml`, then the selected agent's global config, then built-in defaults. Interactive mode needs to ask for the AI agent early enough that, when no project config exists, it can load defaults from that agent's global config before asking the remaining configuration questions.

<!--
The exploration phase: alternatives considered, key decisions made, ambiguities resolved.
This is the record of *how* we decided what we decided.
Written by spek:discuss. Fully rewritten on re-run.
-->

## Assumptions

<!--
Written by spek:discuss. Things taken as given before building â€” external service
behavior, data contracts, scale limits, third-party availability.
Checkboxes ticked [x] by spek:verify when confirmed in the implementation.
Unverifiable assumptions are flagged explicitly rather than left silently unchecked.
-->

None. No external service behavior, data contracts, third-party availability, or scale limits are being assumed for this installer and documentation change.

## Plan

### Tasks

1. [x] Add installer agent metadata for Antigravity
2. [x] Implement agent-specific global config discovery
3. [x] Add Antigravity install roots and initial target-flag behavior
4. [x] Update config guidance in templates and source skills
5. [x] Refresh rendered installed skill copies
6. [x] Update architecture, maintenance, and comparison docs
7. [x] Update README and contributor guidance
8. [x] Run installer smoke tests across supported targets
9. [x] Change target flags from sync-only to install-or-sync
10. [x] Align sync rule and user-facing docs with install-or-sync semantics
11. [x] Refresh rendered skill copies after documentation changes
12. [x] Smoke test first-time and existing-root target-flag paths

### Details

#### 1. Add installer agent metadata for Antigravity

**Files:** `install.js`

**Approach:** Replace repeated `codex`/`opencode` ternaries with a small agent metadata layer that captures label, command prefix, skill reference style, package layout, root marker, and config path behavior. Antigravity should use slash-prefixed visible commands and hyphenated skill references, so `/spek-new` is produced from canonical `spek:new`. Keep the existing command rendering API small enough that templates and final installer output continue to call one clear helper.

#### 2. Implement agent-specific global config discovery

**Files:** `install.js`

**Approach:** Change both flag-mode and interactive config loading so project `.specs/config.yaml` remains sovereign, and the fallback global config is selected from the target agent only. Use the agreed paths: Claude Code `~/.claude/spek-config.yaml`, Codex `~/.codex/spek-config.yaml`, OpenCode `~/.config/opencode/spek-config.yaml`, and Antigravity `~/.agents/spek-config.yml`. In interactive mode, ask for the AI agent early enough to load that agent's global defaults before asking namespace and the remaining configuration questions.

#### 3. Add Antigravity install roots and initial target-flag behavior

**Files:** `install.js`

**Approach:** Add `--antigravity` to non-interactive flag parsing, usage text, and target-agent selection. Install Antigravity skills under `.agents/skills/<namespace>-<skill>/SKILL.md` and `~/.agents/skills/<namespace>-<skill>/SKILL.md`. Reuse the Codex-style package cleanup semantics for stale directories and legacy flat files where applicable. This completed task established the initial sync-only guard; the post-completion discussion changes that behavior in task 9.

#### 4. Update config guidance in templates and source skills

**Files:** `_templates/config.yaml.tmpl`, `skills/*.md`

**Approach:** Remove Claude-only global config fallback language from the config template and source skill read instructions. Replace it with agent-specific wording that stays accurate after rendering for Claude Code, Codex, OpenCode, and Antigravity. Preserve the source convention that user-facing commands use `{{CMD_PREFIX}}spek:<skill>` and internal references use canonical `spek:<skill>`.

#### 5. Refresh rendered installed skill copies

**Files:** `.claude/commands/**`, `.codex/skills/**`, `.opencode/commands/**`, `.agents/skills/**` if present

**Approach:** After source skill and installer changes, run the standard sync commands so installed copies are rendered from canonical source instead of edited by hand. Add the new Antigravity sync command to the sequence and let missing install roots no-op. Confirm Codex and Antigravity `SKILL.md` packages are written as UTF-8 without BOM via the installer path.

#### 6. Update architecture, maintenance, and comparison docs

**Files:** `docs/architecture.md`, `docs/maintenance.md`, `docs/comparison.md`

**Approach:** Update the architecture agent mapping table with Antigravity project/global install paths and the rendering prose for slash-plus-hyphen commands. Update maintenance rules, installer conventions, stale cleanup guidance, and smoke-test commands to include four supported targets. Update comparison language only where the supported-agent or packaging claims change; avoid expanding the framework scope beyond installer/rendering support.

#### 7. Update README and contributor guidance

**Files:** `README.md`, `CLAUDE.md`

**Approach:** Make the user-facing supported-agent list, command examples, sync flags, install-path descriptions, and directory layout include Antigravity. Update contributor guidance that still describes SpekLess as Claude-only or lists only three rendered targets. Keep README as the user-facing source of truth and ensure it does not conflict with `docs/architecture.md`.

#### 8. Run installer smoke tests across supported targets

**Files:** `install.js`, generated scratch-project artifacts

**Approach:** Run at least the documented smoke-test steps 1-3 in a scratch git repo, including `node install.js --claude`, `--codex`, `--opencode`, and `--antigravity`. Verify generated config files contain no `{{PLACEHOLDER}}` strings, Antigravity creates `.agents/skills/spek-new/SKILL.md` when its install root is present, and existing targets still render their expected command forms. Include a targeted check that global config paths are agent-specific and that project config still wins.

#### 9. Change target flags from sync-only to install-or-sync

**Files:** `install.js`

**Approach:** Remove the flag-mode `agentRootExists()` skip guard from project-local and global skill installation so an explicit `--claude`, `--codex`, `--opencode`, or `--antigravity` request creates the selected agent's skill root when absent. Keep flag mode skills-only: it must continue to skip `.specs/config.yaml`, `.specs/_templates/`, `.specs/principles.md`, and interactive prompts. Rename comments and console wording from pure "sync" to "install/sync" so behavior and output match the clarified intent. Preserve `safeHomedir()` behavior: if no home directory can be determined, global install still warns and skips.

#### 10. Align sync rule and user-facing docs with install-or-sync semantics

**Files:** `.specs/principles.md`, `README.md`, `docs/architecture.md`, `docs/maintenance.md`, `docs/comparison.md`, `CLAUDE.md`

**Approach:** Update every place that says target flags are no-ops for missing install roots or only usable after initial install. The new wording should say target flags are non-interactive skills-only install-or-sync commands: they create the selected agent skill root when missing, refresh it when present, and preserve shared project assets. Explicitly evaluate `docs/architecture.md`, `docs/maintenance.md`, and `docs/comparison.md` per the Documentation principle; update only the sections whose claims change.

#### 11. Refresh rendered skill copies after documentation changes

**Files:** `.claude/commands/**`, `.codex/skills/**`, `.opencode/commands/**`, `.agents/skills/**` if present

**Approach:** Run the four target-agent commands after source and documentation guidance is updated so checked-in rendered copies stay aligned with canonical `skills/` and the new installer behavior. Because task 9 changes flag semantics, missing target roots may now be created rather than skipped; verify that any newly created checked-in install root is intentional for this repository. Do not hand-edit rendered packages; use the installer render path to keep command references and UTF-8-without-BOM packaging correct.

#### 12. Smoke test first-time and existing-root target-flag paths

**Files:** `install.js`, generated scratch-project artifacts

**Approach:** In a scratch git repo with an isolated home directory, run at least one packaged target with no existing root, especially `node install.js --antigravity`, and verify `.agents/skills/spek-new/SKILL.md` is created while `.specs/config.yaml` and `.specs/_templates/` are not created or rewritten by flag mode. Then run the same flag again to confirm existing-root sync still refreshes skills and cleans stale rendered packages. Repeat a representative colon-style target such as `--claude` so both flat and packaged layouts are covered, and finish with `node --check install.js` plus the repository's normal diff hygiene checks.

## Review

<!--
Written by spek:review. Fully rewritten on re-run.
This is the pre-execution design review checkpoint: findings, simpler alternatives,
missing dependencies, task ordering issues, and principle conflicts discovered after
Discussion and Plan are in place. spek:plan and spek:discuss may read this section
when the user returns to planning/discussion, but only spek:review rewrites it.
-->

## Verification

**Task-by-task check:**
- Task 1 - Add installer agent metadata for Antigravity: OK - `install.js:150` defines the shared metadata table, and `install.js:187` defines Antigravity with slash commands, hyphen skill references, package layout, and `.agents` root marker.
- Task 2 - Implement agent-specific global config discovery: OK - `install.js:337`-`install.js:350` load the selected target agent's global config in flag mode, and `install.js:388`-`install.js:407` ask for the agent before reading interactive global defaults.
- Task 3 - Add Antigravity install roots and initial target-flag behavior: OK - `install.js:193`-`install.js:197` define Antigravity config and skill roots, `install.js:572`-`install.js:600` reuse packaged skill install and stale cleanup behavior, and `install.js:787`-`install.js:802` wire `--antigravity`.
- Task 4 - Update config guidance in templates and source skills: OK - `_templates/config.yaml.tmpl:3`, `.specs/_templates/config.yaml.tmpl:3`, and `skills/new.md:17` use selected/current-agent global config wording instead of Claude-only fallback language.
- Task 5 - Refresh rendered installed skill copies: OK - `.claude/commands/spek/new.md:17`, `.codex/skills/spek-new/SKILL.md:17`, and `.opencode/commands/spek/new.md:17` reflect the source guidance update.
- Task 6 - Update architecture, maintenance, and comparison docs: OK - `docs/architecture.md:88` documents Antigravity install paths, `docs/maintenance.md:42` and `docs/maintenance.md:88` document Antigravity packaging, and `docs/comparison.md:45` includes Antigravity in native skill support.
- Task 7 - Update README and contributor guidance: OK - `README.md:7` lists Antigravity, `README.md:96` documents `/spek-new` style commands, `README.md:381` documents `.agents/skills`, and `CLAUDE.md:9` describes the cross-agent framework.
- Task 8 - Run installer smoke tests across supported targets: OK - `execution.md` records four-target smoke coverage, and verification reran `node --check install.js`, `git diff --check`, and an isolated target-flag smoke check.
- Task 9 - Change target flags from sync-only to install-or-sync: OK - `install.js:619`-`install.js:625` now always creates/refreshes selected project and global skill roots, while `install.js:538`-`install.js:559` keeps shared project assets behind non-flag installs.
- Task 10 - Align sync rule and user-facing docs with install-or-sync semantics: OK - `.specs/principles.md:43`-`.specs/principles.md:75`, `README.md:61`-`README.md:70`, and `docs/maintenance.md:152`-`docs/maintenance.md:166` describe target flags as skills-only install/sync commands that create missing skill roots and preserve shared project files.
- Task 11 - Refresh rendered skill copies after documentation changes: OK - `.agents/skills/spek-new/SKILL.md:1` starts with frontmatter, `.agents/skills/spek-new/SKILL.md:51` renders `/spek-discuss`, and `.agents/skills/spek-new/SKILL.md` starts with bytes `45,45,45` rather than a UTF-8 BOM.
- Task 12 - Smoke test first-time and existing-root target-flag paths: OK - verification reran an isolated scratch test: `--antigravity` created `.agents/skills/spek-new/SKILL.md` without `.specs/config.yaml` or `.specs/_templates`, rerun removed stale `.agents/skills/spek-old`, and `--claude` created `.claude/commands/spek/new.md` without shared project files.

**Principles check:**
- Code Style / skill conventions: OK - source skill edits are limited to config-read wording and keep the standard section structure.
- Architecture / single-agent topology: OK - Antigravity support is installer/rendering metadata; no new workflow agent roles or orchestration were added.
- Architecture / section ownership: OK - source edits do not rewrite owned spec sections outside this feature; this verification rewrites only `## Verification` and status frontmatter.
- Architecture / document-as-state and append-only log: OK - feature state remains in `spec.md` and `execution.md`; execution log entries were appended, not rewritten.
- Testing / manual smoke test: OK - execution log records installer smoke coverage, and verification reran an isolated scratch check for Antigravity and Claude target-flag paths.
- Documentation / README and architecture consistency: OK - `.specs/project.md:41`, `.specs/project.md:55`, `README.md:7`, and `docs/architecture.md:88` all include Antigravity.
- Sync Rule: OK - `.specs/principles.md:43`-`.specs/principles.md:75` includes Antigravity and documents that target-agent install/sync preserves shared project files.
- Command References: OK - source skills still use canonical `spek:<skill>` and `{{CMD_PREFIX}}spek:<skill>` conventions; Codex/Antigravity installed packages use hyphenated skill names.
- Security: OK - no secrets or unsafe config handling were introduced; config paths remain local per-agent files.

**Goal check:** The implementation achieves the stated goal. Antigravity is represented as a first-class installer target in interactive and flag-mode paths, uses slash-prefixed visible commands with hyphenated skill names, installs package-style skills under `.agents/skills`, uses `~/.agents/spek-config.yml` for its global config, and preserves project `.specs/config.yaml` precedence. Target-agent flags now create or refresh selected skill roots while preserving `.specs/config.yaml` and `.specs/_templates`. Documentation and rendered installed copies are consistent with the four-agent support model.

**Issues found:**
None. `git diff --check` reported only Git line-ending normalization warnings for existing working-copy files.

**Status:** READY_TO_SHIP

## Retrospective

<!--
Written by spek:retro. Fully rewritten on re-run.
This is the post-completion reflection: what changed, what surprised us, and what
should become a durable project principle. spek:retro may also propose principle
additions for user confirmation, but it owns only this section in spec.md.
-->
