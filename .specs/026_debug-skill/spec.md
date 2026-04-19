---
id: 026
title: debug skill
status: done
part_of: SpekLess
starting_sha: 1ebdd18
created: 2026-04-18
tags: []
---

# debug skill

## Context

> Part of [**SpekLess**](../project.md).

SpekLess handles "known work" well — new features, greenfield kickoffs, retroactive adoption, quick tasks. What it doesn't cover is the most common ugly reality in software work: something is broken and the cause is unknown. Bug investigation doesn't map cleanly onto the existing discuss → plan → execute flow because that flow assumes the problem is already framed well enough to design a solution. Debugging's first job is to reduce uncertainty, not to commit to an implementation plan.

`spek:debug` is a new entry-point skill that handles this gap. It combines what `spek:new` and `spek:discuss` do for features into a single bug-intake step: creates a debug-flavored spec, conducts a structured intake conversation (symptom, expected vs. observed behavior, reproduction steps, initial hypotheses), and writes Context + Discussion stubs before handing off to the normal `spek:plan` → `spek:execute` → `spek:verify` flow.

The skill targets any project using SpekLess, not just SpekLess itself. Its primary goal is to prevent AI-assisted debugging's biggest failure mode — treating a hypothesis as a confirmed root cause — by making uncertainty explicit and structured from the very start.

Done looks like:
- `skills/debug.md` exists and is installed/synced like any other skill
- Running `spek:debug` creates a bug spec with `type: bug` and `confidence: unknown` in frontmatter
- It conducts a structured intake and writes Context + Discussion stubs + a two-group `## Plan` stub
- `spek:status` surfaces `type` and `confidence` for bug specs alongside the normal status column
- The skill stays under 300 lines

## Discussion

**Alternatives considered**

*Full investigation driver.* Making `spek:debug` actively drive the investigation — running commands, reading logs, updating findings in `execution.md`, gating the fix phase — was considered and rejected. It would violate the single-agent topology principle, push well past the 300-line limit, and duplicate what the main conversation already does well. Entry-point only keeps the skill composable and the philosophy intact.

*Separate spec structure.* A fully different document shape (Symptom / Root Cause / Fix / Post-mortem) was considered. Rejected because it breaks composability with `spek:plan`, `spek:execute`, and `spek:verify`, all of which read standard section names. Same sections with bug-specific content wins.

*Skeleton only, defer intake to `spek:discuss`.* Creating a `type: bug` skeleton and making `spek:discuss` bug-aware was the most composable option. Rejected because the structured intake is the primary value of the skill — capturing symptom, expected, observed, reproduction steps, and initial hypotheses before any investigation begins. If deferred, users skip it.

**Decisions made**

- `spek:debug` = `spek:new` + bug-flavored intake conversation in one step. `spek:discuss` is skipped for bugs; users go straight to `spek:plan` next.
- Same spec sections as feature specs (Context / Discussion / Assumptions / Plan / Verification / Retrospective). No new template needed. Full composability downstream.
- `confidence: unknown | low | medium | high` in frontmatter, set to `unknown` on creation. Updated by the user as investigation narrows. Read by `spek:verify` before confirming the fix.
- `type: bug` in frontmatter. Read by `spek:status` to differentiate bugs from features and surface confidence level in the status table.
- `spek:debug` writes a two-group stub in `## Plan`: `### Investigation` (tasks TBD) and `### Fix` (TBD). `spek:plan` fills both groups in one pass once the user has sufficient context. The `confidence` field signals readiness but doesn't gate anything automatically — the user decides when to run `spek:plan`.

**Ambiguities resolved**

- *How does the shift from investigation to fix happen?* Single `spek:plan` run that fills both task groups. No automatic phase transition.
- *Does `spek:plan` need to be bug-aware?* Only to the extent of detecting the `### Investigation` / `### Fix` stub and filling it rather than writing the default `### Tasks` structure. The spec shape guides it.

**Cascade effects (flagged for planning)**

- `spek:status` needs updates to read `type` and `confidence` frontmatter fields and surface them in its output.
- `spek:plan` needs to detect the debug plan stub and fill the two task groups rather than rewriting to the default structure.

## Assumptions

None. No external bets identified — this skill has no dependencies on third-party behavior, data contracts, or scale limits.

## Plan

<!--
Written by spek-plan. Fully rewritten on re-run, EXCEPT checkbox state in ### Tasks,
which spek-execute owns.
-->

### Tasks

1. [x] Create `skills/debug.md`
2. [x] Update `skills/status.md` to surface `confidence`
3. [x] Update `skills/plan.md` to handle debug specs via `type: bug` detection
4. [x] Update `skills/verify.md` to surface `confidence` for bug specs
5. [x] Sync all five skills to installed copies
6. [x] Update docs (README.md, architecture.md, maintenance.md, CLAUDE.md; evaluate comparison.md)
7. [x] Update `skills/execute.md` to iterate `### Investigation` / `### Fix` groups for bug specs
8. [x] Fix stale prose in `skills/status.md` (line 21)
9. [x] Update `skills/resume.md` for bug specs
10. [x] Sync `status.md` and `resume.md` to installed copies

### Details

#### 1. Create `skills/debug.md`

**Files:** `skills/debug.md` (new)

**Approach:** Write the skill following standard sections convention (Inputs / Reads / Behavior / Writes / Output to user / Hard rules). Behavior: read config for `specs_root`, determine next spec ID (same logic as `spek:new`), conduct structured intake (symptom, expected vs. observed, reproduction steps, up to 3 initial hypotheses), then write `<specs_root>/NNN_<slug>/spec.md`. Write the spec content directly — do not use `spec.md.tmpl`, which is a feature-spec skeleton for `install.js` only. Frontmatter includes all standard fields plus `type: bug` and `confidence: unknown` appended after `tags:`. Context is populated from the symptom; Discussion is seeded from the intake decisions/hypotheses; Plan stub writes `### Investigation` (placeholder tasks TBD) and `### Fix` (TBD), not `### Tasks`. Stay under 300 lines; no investigation driving, no forced commits.

#### 2. Update `skills/status.md` to surface `confidence`

**Files:** `skills/status.md`

**Approach:** Add `confidence` to the frontmatter field extraction list in the Reads section (alongside the existing `id`, `title`, `status`, `type`, `part_of`). In the all-features table, add a `Confidence` column: show the `confidence` value for rows where `type: bug`, show `—` for all others. In the single-feature detail block, add a `Confidence: <value>` line immediately after `Status:` when the spec has `type: bug`. The existing `type` column and all other behavior are unchanged — `spek:status` already reads and displays `type`.

#### 3. Update `skills/plan.md` to handle debug specs via `type: bug` detection

**Files:** `skills/plan.md`

**Approach:** In the Reads section, add frontmatter as a targeted read (alongside the existing section-scoped reads). In the Behavior section, add a detection branch: after reading the spec frontmatter, check `type: bug` (not header scanning — frontmatter is authoritative and survives replanning). If `type: bug`, fill `### Investigation` and `### Fix` groups with numbered tasks and corresponding `### Details` subsections, using the same Details pattern as the standard path. The default `### Tasks` + `### Details` path is untouched for non-bug specs. The Writes section gets a second output-format example showing the Investigation/Fix variant. Checkbox-preservation semantics apply identically in both paths.

#### 4. Update `skills/verify.md` to surface `confidence` for bug specs

**Files:** `skills/verify.md`

**Approach:** In the Reads section, add `type` and `confidence` to the frontmatter fields extracted from `spec.md`. In the Behavior section, when `type: bug`, read `confidence` and include it in the verification report as an advisory item: note the current confidence level alongside the task-completion summary and suggest that the user update `confidence` in frontmatter if the investigation has narrowed the root cause. This is advisory-only — `confidence` does not gate pass/fail verdicts. Existing task-completion checking, Assumptions-ticking, and principles-conflict reporting are unchanged.

#### 5. Sync all five skills to installed copies

**Files:** `.claude/commands/spek/debug.md` (new), `.claude/commands/spek/status.md`, `.claude/commands/spek/plan.md`, `.claude/commands/spek/verify.md`, `.claude/commands/spek/execute.md`, `~/.claude/commands/spek/` (same five files), `.opencode/commands/spek/` and `~/.config/opencode/commands/spek/` (same five, check existence first), `.codex/skills/spek-debug/SKILL.md` (new), `.codex/skills/spek-status/SKILL.md`, `.codex/skills/spek-plan/SKILL.md`, `.codex/skills/spek-verify/SKILL.md`, `.codex/skills/spek-execute/SKILL.md`

**Approach:** For each install root that exists, apply render rules: replace `{{CMD_PREFIX}}` with the agent-specific prefix (`/` for Claude Code and OpenCode; `$` for Codex), replace canonical `spek:<skill>` references with `{ns}:<skill>` (Claude Code/OpenCode) or `{ns}-<skill>` (Codex). For the new `debug.md`, create the Codex package directory `spek-debug/` before writing `SKILL.md`. Check existence of each install root — local and global — before syncing; do not create a root that does not already exist.

#### 6. Update docs

**Files:** `README.md`, `docs/architecture.md`, `docs/maintenance.md`, `CLAUDE.md`; evaluate `docs/comparison.md`

**Approach:** In `README.md`, add `debug.md` to every skill inventory and directory layout listing that enumerates the installed skill set. In `docs/architecture.md`, document the `type: bug` / `confidence` frontmatter convention, the two-group Plan structure for bug specs (`### Investigation` / `### Fix`), the `type: bug` detection approach in `spek:plan`, and `spek:debug` in the skill catalog. In `docs/maintenance.md`, add `debug.md` to the skill file conventions listing and any "Adding a new skill" checklist steps. In `CLAUDE.md`, add `debug.md` to the `skills/` directory tree under the Repository structure section. For `docs/comparison.md`: evaluate whether `spek:debug`'s deliberate scope limit (entry-point only, no investigation driving) warrants a note distinguishing it from GSD-style debugging; add a brief comparison note if so.

#### 7. Update `skills/execute.md` to iterate `### Investigation` / `### Fix` groups for bug specs

**Files:** `skills/execute.md`

**Approach:** In the Reads section, add `type` to the frontmatter fields extracted from `spec.md`. In the Behavior section, add a detection branch after reading the frontmatter: if `type: bug`, iterate unchecked tasks under `### Investigation` first, then `### Fix`, using the same per-task loop (read Details, log, edit, tick checkbox, log complete). The existing `### Tasks` path is untouched for non-bug specs. Checkbox-ticking semantics are identical in both paths — `spek:execute` owns checkbox state in all task groups. The `### Details` subsections are shared between both paths and require no structural change. Also update task 5's file list and sync task 5 in `skills/execute.md` to installed copies alongside the other four skills.

#### 8. Fix stale prose in `skills/status.md` (line 21)

**Files:** `skills/status.md`

**Approach:** At line 21, change "read ONLY frontmatter and the `### Tasks` subsection" to accurately describe that the two bulk Greps (`^\d+\. \[.\]` and `^\d+\. \[x\]`) capture checkboxes from any task group — `### Tasks` for standard specs, `### Investigation` / `### Fix` for bug specs. The Grep logic is already correct and unchanged; only the descriptive prose needs updating. No behavior change.

#### 9. Update `skills/resume.md` for bug specs

**Files:** `skills/resume.md`

**Approach:** Three targeted edits: (1) In the Reads section (line 21), change "`### Tasks` checkbox lines only" to "task checkbox lines (from `### Tasks` for standard specs; `### Investigation` / `### Fix` for bug specs)"; also add `type` and `confidence` to the frontmatter fields listed. (2) In the Behavior section, update the checkbox-count description to note that the `N. [x]` pattern catches all groups regardless of section name. (3) Add a bug-spec display variant alongside the existing example — showing `Investigation:` / `Fix:` group labels and a `Confidence:` line — mirroring the format already present in `skills/status.md`. No new reads or writes beyond what the skill already does; the Grep pattern already works across all task groups.

#### 10. Sync `status.md` and `resume.md` to installed copies

**Files:** `.claude/commands/spek/status.md`, `.claude/commands/spek/resume.md`, `.opencode/commands/spek/status.md`, `.opencode/commands/spek/resume.md`, `.codex/skills/spek-status/SKILL.md`, `.codex/skills/spek-resume/SKILL.md`

**Approach:** For each install root that exists, copy the updated source file and apply the same render rules as original Task 5: `{{CMD_PREFIX}}` → `/` (Claude Code/OpenCode) or `$` (Codex); `spek:` → `spek-` (Codex only). No new install roots; no global roots (they don't exist for this project). Check existence before writing.

## Review

<!--
Written by spek:review. Fully rewritten on re-run.
This is the pre-execution design review checkpoint: findings, simpler alternatives,
missing dependencies, task ordering issues, and principle conflicts discovered after
Discussion and Plan are in place. spek:plan and spek:discuss may read this section
when the user returns to planning/discussion, but only spek:review rewrites it.
-->

**Summary:** The design is coherent and the five tasks cover the core deliverables. However, three warnings need resolution before execution: template handling for `type`/`confidence` frontmatter is undefined, a promised `spek:verify` update has no corresponding task, and the plan-detection logic in Task 3 is fragile. None are fatal — the plan can be tightened in a single `spek:plan` pass.

**Critical findings:**
- None.

**Warnings:**
- **Task 1 — template handling undefined.** `spec.md.tmpl` has no `type` or `confidence` fields. Discussion says "No new template needed," but Task 1 doesn't state whether `spek:debug` writes frontmatter inline (diverging from template-managed specs) or whether `_templates/spec.md.tmpl` gets those optional fields added. If the latter, Task 5's file list is incomplete (template omitted). The implementation decision must be explicit before execution.
- **`spek:verify` update promised but not planned.** Discussion states `confidence` is "Read by `spek:verify` before confirming the fix" — but no task updates `spek:verify`. Either add a task to make verify confidence-aware, or remove the promise from Discussion as out of v1 scope. Leaving the gap means execution produces a discrepancy between Discussion and the actual skill set.
- **Task 3 — plan detection is fragile.** Detecting a debug spec by searching for `### Investigation`/`### Fix` headers in `## Plan` produces a false negative if a prior `spek:plan` run already rewrote those groups to the default `### Tasks` structure, and a false positive if a non-bug spec happens to use those headings. Checking `type: bug` in frontmatter is more reliable and should be the primary (or sole) detection signal.

**Notes:**
- **Task 5 omits `docs/comparison.md`.** Principles require explicitly evaluating `comparison.md` as a candidate update target when a skill is added. It isn't listed. May conclude "no change needed," but that evaluation must be explicit per principle.
- **Task 2 unverified assumption.** Task 2 states "the existing `type` column... is unchanged" — but standard frontmatter has no `type` field, so it is unclear whether `spek:status` already displays it. If it doesn't, Task 2 must add both `type` and `confidence` columns, not just `confidence`. Executor must verify before writing the update.
- **CLAUDE.md skills listing not covered.** CLAUDE.md contains a `skills/` directory tree enumerating every skill. Adding `debug.md` requires updating it. Not mentioned in Task 5.
- **Task 4 global OpenCode/Codex paths omitted from file list.** The listed paths include `~/.claude/commands/spek/` but omit `~/.config/opencode/commands/spek/` and any global Codex root. The "check existence first" approach in the approach text likely handles this at runtime, but the file list is incomplete and could mislead the executor.

**Recommended next move:** `spek:plan` — three warnings require concrete plan revisions before execution is safe.

## Verification

**Task-by-task check:**
- Task 1 — Create `skills/debug.md`: ✓ — 139 lines, correct section order, `{{CMD_PREFIX}}spek:<skill>` in user-facing output, no template use, no `execution.md` creation, two-group Plan stub (Investigation/Fix), slug collision rule present
- Task 2 — Update `skills/status.md` to surface `confidence`: ✓ — `confidence` in frontmatter extract, Confidence column in both table variants, single-feature detail shows `Confidence:` after `Status:` for bug specs
- Task 3 — Update `skills/plan.md` for `type: bug` detection: ✓ — frontmatter-authoritative detection, Investigation/Fix path with continuous numbering, checkbox-preservation stated for both groups
- Task 4 — Update `skills/verify.md` to surface `confidence`: ✓ — reads `type` and `confidence` from frontmatter, confidence advisory is advisory-only (doesn't gate verdicts), Investigation-before-Fix iteration stated
- Task 5 — Sync all five skills to installed copies: ✓ — `.claude/`, `.opencode/`, `.codex/` all updated; `{{CMD_PREFIX}}` rendered correctly; Codex `spek:` → `spek-`; BOM-free; `spek-debug/` directory created
- Task 6 — Update docs: ✓ — README entry points table + directory layout; CLAUDE.md skills tree; `architecture.md` type:bug/confidence section + `spek:debug` in catalog; `comparison.md` entry-point-only note; `maintenance.md` correctly left unchanged (no per-skill listing)
- Task 7 — Update `skills/execute.md` for Investigation/Fix iteration: ✓ — reads `type` from frontmatter, iterates Investigation then Fix for bug specs, Writes section covers both task group forms
- Task 8 — Fix stale prose in `skills/status.md`: ✓ — "### Tasks only" language removed; Reads and Behavior sections now accurately describe that the Grep pattern catches checkboxes from any task group
- Task 9 — Update `skills/resume.md` for bug specs: ✓ — Reads section includes `type`/`confidence`; Behavior notes pattern catches all groups; bug-spec display variant with Investigation/Fix labels and `Confidence:` line present
- Task 10 — Sync `status.md` and `resume.md` to installed copies: ✓ — `.claude/`, `.opencode/`, `.codex/` all updated; CMD_PREFIX and `spek:` references correctly rendered

**Principles check:**
- Skill files under ~300 lines: ✓ — `debug.md` is 139 lines; all modified skills well under limit
- Correct section order (Inputs/Reads/Behavior/Writes/Output/Hard rules): ✓ — confirmed in `debug.md`
- Single-agent topology: ✓ — `debug.md` Hard rules prohibit sub-agents; intake runs in main conversation
- Section ownership strict: ✓ — `debug.md` only creates new specs; touches no existing section
- Document is the state: ✓ — `confidence` lives in frontmatter, read directly by skills
- Append-only execution log: ✓ — `debug.md` explicitly does not create `execution.md`
- Sync rule (rendered, not raw copy): ✓ — `{{CMD_PREFIX}}` substituted; `spek:` → `spek-` in Codex; no BOM on Codex copies
- Skill inventory updated everywhere: ✓ — README, CLAUDE.md, `architecture.md`, `comparison.md` all updated
- `{{CMD_PREFIX}}spek:<skill>` in user-facing output: ✓ — present in source; rendered correctly in all three install targets
- Principles-aware: ✓ — `debug.md` reads `principles.md`; Hard rules enforce consistency with it

**Goal check:** All five "Done looks like" criteria are satisfied: `skills/debug.md` exists and is synced to all three install roots; the skill creates a spec with `type: bug` and `confidence: unknown`; it runs a four-question structured intake and writes Context + Discussion stubs + a two-group Plan stub (Investigation/Fix); `spek:status` surfaces a `Confidence` column for bug specs in both table variants and in single-feature detail; the skill is 139 lines, well under the 300-line limit. The full downstream flow composes correctly: `spek:debug` → `spek:plan` (detects `type: bug`) → `spek:execute` (iterates Investigation then Fix) → `spek:verify` (reads confidence, advisory only) → `spek:status` (shows Confidence column).

**Issues found:**
1. `skills/status.md:127` (Hard rules) — describes the Grep patterns as `^\[.\]` and `^\[x\]`, while the Reads (line 21) and Behavior (line 30) sections use the updated `^\d+\. \[.\]` form. Cosmetic inconsistency only; a model reading the full skill follows Reads/Behavior. Non-blocking.

**Status:** READY_TO_SHIP

## Retrospective

<!--
Written by spek:retro. Fully rewritten on re-run.
This is the post-completion reflection: what changed, what surprised us, and what
should become a durable project principle. spek:retro may also propose principle
additions for user confirmation, but it owns only this section in spec.md.
-->
