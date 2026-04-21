---
id: 031
title: Add --claude / --codex / --opencode target flags to install.js
status: done
part_of: SpekLess
starting_sha: fe39ea1
created: 2026-04-22
tags: []
---

# Add --claude / --codex / --opencode target flags to install.js

## Context

> Part of [**SpekLess**](../project.md).

<!--
Why this feature exists. The problem it solves, for whom, under what constraints.
Also: the goal / success criteria — what does "done" look like?
Written by spek:new (skeleton) or spek:discuss (filled in during conversation).
Stable once agreed; spek:discuss may refine it but rarely rewrites from scratch.
-->

Two related problems, one fix:

**Problem 1 — No targeted install.** The installer always renders all skills to all detected install roots. If a user has Claude Code, Codex, and OpenCode all installed, running `node install.js` touches all three even if they only want to update one. There is also no way to add an install root after the initial setup without re-running the full interactive flow.

**Problem 2 — Sync drift from direct file copy.** The Sync Rule in `principles.md` says to run `node install.js` whenever a skill changes, but executors consistently shortcut to copying only the modified file directly. This misses other install roots (Codex, OpenCode, global `~/.claude`) and leaves other skills with accumulated drift uncaught — as observed when running the installer manually after feature 030 changed 10 additional skills that should have been in sync.

**Fix:** Add `--claude`, `--codex`, and `--opencode` CLI flags to `install.js`. Each flag targets exactly that agent's install roots (project-local and global). `--claude` is equivalent to the current default behavior. With named flags, the Sync Rule and skill Hard rules can be updated to prescribe the exact three-command sync sequence:

```
node install.js --claude
node install.js --codex
node install.js --opencode
```

Running all three ensures every install root is updated regardless of which agents the user has installed. Each run is a no-op for install roots that don't exist, so the sequence is safe to run unconditionally. This replaces the vague "run the installer" instruction with a concrete, copy-proof sync recipe.

## Discussion

<!--
The exploration phase: alternatives considered, key decisions made, ambiguities resolved.
This is the record of *how* we decided what we decided.
Written by spek:discuss. Fully rewritten on re-run.
-->

### Alternatives considered

**A. Interactive agent selection at install time (rejected).** The installer already asks configuration questions interactively. Adding an agent-selection question there would handle the initial case but would not help with the incremental sync problem — users re-running `node install.js` for a sync would still need to sit through the full interactive flow.

**B. A separate `sync.js` script (rejected).** This keeps install and sync concerns cleanly separated, but it means maintaining two scripts that share most of their rendering logic. Flags on the existing installer are a simpler surface with no new files.

**C. `--claude`, `--codex`, `--opencode` flags on `install.js` (chosen).** Each flag targets that agent's install roots (project-local + global) without touching others. Flags are additive and can be combined if needed. An unrecognized flag prints usage and exits cleanly. When no flag is given, the installer falls back to full interactive mode — preserving the existing first-run experience without any breakage.

### Decisions made

- Flags are opt-in: the zero-flag path remains the current interactive flow. Existing users and CI scripts that call `node install.js` without flags are unaffected.
- Each flag covers both the project-local and global install root for that agent (e.g., `--claude` writes to both `.claude/commands/{ns}/` and `~/.claude/commands/{ns}/`). This matches how the interactive flow already handles roots.
- The Sync Rule in `principles.md` and affected skill Hard rules will be updated to prescribe the concrete three-command sequence, replacing the vague "run the installer" instruction.
- No `--all` flag is introduced; running all three individual commands is the idiomatic pattern and makes it explicit which agents are being touched.

### Ambiguities resolved

- **What happens when the targeted agent is not installed?** Each flag is a no-op for roots that don't exist. No error, no directory creation. This makes the three-command sequence safe to run unconditionally on any machine.
- **Does flag mode skip the interactive questions?** Yes — when a flag is present, the installer uses existing config (reads `config.yaml` if present, uses defaults otherwise) and skips all `readline` prompts. This is the whole point: flags enable non-interactive, targeted re-runs.

## Assumptions

<!--
Written by spek:discuss. Things taken as given before building — external service
behavior, data contracts, scale limits, third-party availability.
Checkboxes ticked [x] by spek:verify when confirmed in the implementation.
Unverifiable assumptions are flagged explicitly rather than left silently unchecked.
-->

None. No external bets identified — this task has no dependencies on third-party behavior, data contracts, or scale limits. All logic is self-contained within `install.js` and the local filesystem.

## Plan

<!--
Written by spek:plan. Fully rewritten on re-run, EXCEPT checkbox state in ### Tasks,
which spek:execute owns.
-->

### Tasks

<!-- One checkbox per atomic unit of work. spek:execute ticks these as it completes them. -->

1. [x] Parse `--claude`, `--codex`, `--opencode` flags in `main()` and update usage comment
2. [x] Add `buildFlagConfig()` to derive config non-interactively from existing config.yaml
3. [x] Route flag mode through `main()`: call `buildFlagConfig`, skip git check and interactive cards
4. [x] Guard `runInstall()` against missing agent roots — skip with log message, never create
5. [x] Update `principles.md` Sync Rule with the concrete three-command recipe
6. [x] Update `docs/maintenance.md` sync procedure; check `README.md` and `docs/architecture.md` for needed updates

### Details

#### 1. Parse `--claude`, `--codex`, `--opencode` flags in `main()` and update usage comment

**Files:** `install.js`

**Approach:** In `main()`, extend the args array parse (currently lines 692–695) to detect `--claude`, `--codex`, and `--opencode` and set a `targetAgent` variable (`'claude_code'`, `'codex'`, `'opencode'`, or `null`). If an unrecognized flag is found (starts with `--` and is not one of the four known flags), print a usage message (`node install.js [--claude | --codex | --opencode] [--defaults]`) and `process.exit(1)`. Update the JSDoc usage comment at the top of the file to show the three new flags.

#### 2. Add `buildFlagConfig()` to derive config non-interactively from existing config.yaml

**Files:** `install.js`

**Approach:** Add a new synchronous function `buildFlagConfig(targetAgent, cwd)` that reads `namespace`, `specs_root`, `suggest_commits`, `subagent_threshold`, and `commit_style` from the existing per-project `config.yaml` using `readYamlValue` (falling back to the same defaults as `collectConfig`). Sets `aiAgent` from `targetAgent`, computes `cmdPrefix` (`'$'` for codex, `'/'` otherwise), sets `installScope` to `'3'` (both project-local and global), and `createPrinciples: false` (sync run, not first install). Returns the same shape as `collectConfig`'s return object so `runInstall` is unchanged.

#### 3. Route flag mode through `main()`: call `buildFlagConfig`, skip git check and interactive cards

**Files:** `install.js`

**Approach:** In `main()`, after detecting `targetAgent`, branch the flow: when `targetAgent !== null`, call `buildFlagConfig(targetAgent, cwd)` instead of the full `collectConfig` path. Skip the git-repo check, the welcome card (step 1), and the summary card (step 3) — output a one-line sync banner instead (e.g., `Syncing skills for --claude…`). Pass the resulting config straight to `runInstall`. The card step numbers in `runInstall` do not need to change since they only appear in interactive mode; the flag-mode path skips the step cards anyway.

#### 4. Guard `runInstall()` against missing agent roots — skip with log message, never create

**Files:** `install.js`

**Approach:** Add a helper `agentRootExists(agent, rootDir)` that checks for the top-level agent directory (`rootDir/.claude`, `.codex`, or `.opencode`). In `runInstall`, before each `installSkillsTo` call, check `agentRootExists` for that root. If the root is absent, print an info message (`⊘ No <agent> install root at <path> — skipping`) and skip rather than calling `installSkillsTo`. This is a flag-mode-only guard: in interactive mode (where `installSkillsTo` was preceded by `mkdirSafe`), the root is always created by the interactive flow first, so no existing behavior changes. Pass a `flagMode` boolean through `config` (set `true` by `buildFlagConfig`, `false` by `collectConfig`) to make the guard conditional.

#### 5. Update `principles.md` Sync Rule with the concrete three-command recipe

**Files:** `.specs/principles.md`

**Approach:** In the `## Sync Rule` section, replace the current vague "Running `node install.js` handles these sync cases automatically on re-run" sentence with the explicit three-command recipe:

```
node install.js --claude
node install.js --codex
node install.js --opencode
```

Add a note that each command is a no-op for install roots that don't exist, making the sequence safe to run unconditionally. Keep the rest of the Sync Rule table and render semantics unchanged.

#### 6. Update `docs/maintenance.md` sync procedure; check `README.md` and `docs/architecture.md` for needed updates

**Files:** `docs/maintenance.md`, `README.md`, `docs/architecture.md`

**Approach:** Read the "Making changes" / sync checklist sections of `docs/maintenance.md` and replace any "run `node install.js`" sync instructions with the three-command recipe. Then scan `README.md` for the installer usage section and add documentation for the three new flags (one paragraph in the Usage section, showing when to use them). Check `docs/architecture.md` for any mention of the installer's flag interface or sync behavior — update if present, leave unchanged if the installer is only described at a conceptual level. The Documentation principle requires explicit evaluation of all three files.

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
- Task 1 — Parse flags in main() and update usage comment: ✓ — `install.js:22-26` usage comment updated; `install.js:755-767` known-flag validation loop + ternary chain for targetAgent.
- Task 2 — Add buildFlagConfig(): ✓ — `install.js:281-308` reads config.yaml (per-project then global fallback), returns same shape as collectConfig with `flagMode: true`.
- Task 3 — Route flag mode through main(): ✓ — `install.js:787-793` early-return branch skips welcome card, git check, summary card, collectConfig. `install.js:472` suppresses card(4,5) when `flagMode` is true.
- Task 4 — Guard runInstall() against missing agent roots: ✓ — `install.js:480-485` agentRootExists helper maps claude_code→.claude, codex→.codex, opencode→.opencode. Guards at lines 582-596 wrap both installSkillsTo call sites.
- Task 5 — Update principles.md Sync Rule: ✓ — `.specs/principles.md:43-51` three-command recipe replaces vague sentence.
- Task 6 — Update docs/maintenance.md; check README.md and architecture.md: ✓ — `docs/maintenance.md:154-159` updated. `README.md:61-70` new paragraph added. architecture.md evaluated: only references install.js in directory tree — no flag docs needed.

**Principles check:**
- Code Style: ✓ — No skill files modified.
- Architecture: ✓ — No section ownership, document-as-state, or topology concerns.
- Testing: ✓ — Smoke test procedure in maintenance.md updated with three-command recipe.
- Documentation: ✓ — README, maintenance.md, architecture.md all evaluated per principle. No skill inventory changes needed (no skills added/removed/renamed).
- Sync Rule: ✓ — Updated to concrete three-command recipe, internally consistent with implementation.
- Command References: ✓ — No skill files touched.
- Security: ✓ — No secrets, no new dependencies.

**Goal check:** The implementation achieves the Context goal. `--claude`, `--codex`, and `--opencode` flags each target that agent's project-local and global install roots. The flag-mode path is fully non-interactive (no readline prompts, no cards). Missing roots are skipped with a log message rather than created. The Sync Rule now prescribes the concrete three-command sequence, replacing the vague "run the installer" instruction. The three-command sync recipe is safe to run unconditionally since each command is a no-op for absent roots.

**Issues found:**
1. **Minor text inconsistency** — Discussion line 54 says "Flags are additive and can be combined if needed" but the ternary chain (`install.js:764-767`) accepts exactly one flag per invocation (picks the first match). Running `--claude --codex` silently processes only `--claude`. The Sync Rule prescribes separate commands, so this is consistent with the actual goal, but the Discussion text should say "Each invocation accepts exactly one target flag" to match the implementation.

**Status:** READY_TO_SHIP

## Retrospective

<!--
Written by spek:retro. Fully rewritten on re-run.
This is the post-completion reflection: what changed, what surprised us, and what
should become a durable project principle. spek:retro may also propose principle
additions for user confirmation, but it owns only this section in spec.md.
-->
