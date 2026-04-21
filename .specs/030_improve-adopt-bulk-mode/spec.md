---
id: 030
title: Improve adopt bulk mode — principles inference and spec quality
status: done
part_of: SpekLess
starting_sha: 1772a48
created: 2026-04-21
tags: [adopt, bulk-mode, principles, spec-quality]
---

# Improve adopt bulk mode — principles inference and spec quality

## Context

> Part of [**SpekLess**](../project.md).

Bulk-adopting ~10 specs for the `riftle` project exposed two quality gaps in `spek:adopt`.

The first gap is `principles.md`: after bulk adoption, the file remains full of `<e.g.,` template placeholders. Every skill reads `principles.md` on every invocation to constrain plans and guide verification — leaving it as template means all adopted specs are authored without any coding principles in scope. The fix is to infer principles at the end of Phase 1, after FEATURES.md is written: ask 3 targeted questions (testing philosophy, banned patterns, code style anchor), then read code signals inline (linting config, representative test files, package manifest), and synthesize the results into a filled `principles.md`. If the file already has real content (no `<e.g.,` strings), the step is skipped entirely.

The second gap is spec quality. Adopted `## Context` sections omit important dimensions — they note what files exist but not why the feature exists, who it serves, what tradeoffs were made, or what it explicitly doesn't handle. Task titles read as code comments: file paths and function names in the title, implementation pseudocode in the detail block. The fix is to require all four Context dimensions for every adopted spec (problem & motivation, user/system impact, key design decisions, explicit out-of-scope), and to reformat tasks so titles express developer intent in imperative mood and detail blocks explain WHY + HOW in narrative prose, with file paths relegated to the end of each block.

Both changes apply equally to single-feature mode and bulk Phase 2 synthesis.

## Discussion

_Imported from current conversation on 2026-04-21._

**Principles inference design decisions:**
- Source: ask 3 questions then infer from code — not questions-only (misses code evidence) and not code-only (misses intent, especially banned patterns and testing stance).
- Questions (3 max): testing philosophy (mocks vs real services), banned patterns (what would a bad PR look like), code style anchor (one rule that would surprise an outsider). These cover the dimensions that code inspection cannot reliably reveal.
- Code signals: inline reads only — linting config (`.eslintrc*`, `.clippy.toml`, `rustfmt.toml`, pyproject `[tool.ruff]`), 2–3 representative test files, `package.json`/`Cargo.toml`/`pyproject.toml`. No sub-agent: fast, targeted, preserves the single-agent topology invariant.
- Detection: check for `<e.g.,` strings in `principles.md`. Absence means user-authored content → skip all inference.
- Timing: end of Phase 1 (after FEATURES.md is written, before the STOP). Principles are ready before the user reviews FEATURES.md.

**Context quality design decisions:**
- Four required dimensions: problem & motivation, user/system impact, key design decisions, explicit out-of-scope. Each must have 1–3 substantive sentences drawn from code evidence.
- If a dimension can't be determined: flag it explicitly rather than omitting it or fabricating.

**Task format design decisions:**
- Title: imperative mood, developer intent. No file paths or function names in the title. Example: "Implement UAC-safe elevated launch" not "src/launch.rs: add ShellExecuteW with runas".
- Detail block: short narrative paragraph explaining WHY this approach was chosen, HOW it works, and any edge cases. File paths go at the end of the detail block.
- This format was chosen over bullet-list or code-comment style because it makes the spec readable as a design document, not a code annotation.

## Assumptions

- [x] `skills/adopt.md` at 215 lines stays within the ~300-line budget after estimated additions of ~37 lines.
- [x] The same quality rules (Context dimensions + task format) apply in both single-feature mode (step 4) and bulk Phase 2 (step 4) — no mode-specific exceptions.
- [ ] `principles.md` with no `<e.g.,` strings is reliably user-authored content. The template always contains at least one `<e.g.,` string. <!-- unverifiable: design invariant — cannot be verified by reading code; would require inspecting all possible template variants -->
- [x] Principles inference must not spawn sub-agents — inline reads only, to preserve the single-agent topology invariant.

## Plan

### Tasks

1. [x] Add principles inference step to single-feature mode and Phase 1
2. [x] Update Reads, Writes, Output to user, and Hard rules for principles inference
3. [x] Require four Context dimensions in single-feature and Phase 2 synthesis
4. [x] Require developer-intent task titles and narrative detail blocks in single-feature and Phase 2 synthesis
5. [x] Sync updated skills/adopt.md to all existing installed copies

### Details

#### 1. Add principles inference step to single-feature mode and Phase 1

Add a principles inference step in both paths of `skills/adopt.md`.

**Single-feature mode:** Add step 2.5 between step 2 (Explore code) and step 3 (Create folder). Guard: read `.specs/principles.md`; if it exists and contains no `<e.g.,` strings → real user content, skip entirely. If inference needed: (a) AskUserQuestion with 3 questions — testing philosophy (mocks acceptable? minimum expectation?), banned patterns (what would a bad PR look like?), code style anchor (one rule that would surprise an outsider); (b) Read code signals inline — linting config (`.eslintrc*`, `.clippy.toml`, `rustfmt.toml`, pyproject `[tool.ruff]` section), 2–3 representative test files to observe actual patterns, `package.json`/`Cargo.toml`/`pyproject.toml`; (c) Synthesize user answers + code evidence: replace `<e.g.,` placeholder lines with actual project conventions; flag any section that couldn't be determined rather than fabricating; (d) Write `.specs/principles.md`.

**Phase 1:** Add step 8.5 between step 8 (write FEATURES.md) and step 9 (STOP). Same guard, same AskUserQuestion, same inline code-signal reads, same synthesis, same write target.

Placing inference before folder creation in single-feature mode means principles are in scope when the spec is written.

**Files:** `skills/adopt.md` (Behavior: Single-Feature Mode between steps 2 and 3; Behavior: Bulk Phase 1 between steps 8 and 9)

#### 2. Update Reads, Writes, Output to user, and Hard rules for principles inference

Four targeted edits to `skills/adopt.md`:

- **Reads (item 2):** extend to add — "If it exists and contains no `<e.g.,` strings, it has real user content; principles inference is skipped."
- **Writes:** In single-feature block, add "`principles.md` — written if absent or template (contains `<e.g.,` strings); skipped if already user-authored." In Phase 1 block, add the same conditional entry.
- **Output to user (both modes):** Add a conditional line — "Principles: [written | already present — skipped]."
- **Hard rules:** Add "Principles inference (both modes). Run after code exploration (single-feature: before folder creation; Phase 1: after FEATURES.md, before STOP). Skip if `principles.md` already has real content (no `<e.g.,` strings). Ask 3 questions, read linting config/test files/package manifest inline — no sub-agent. Do not fabricate conventions; flag undeterminable sections explicitly."

**Files:** `skills/adopt.md` (Reads, Writes, Output to user, Hard rules sections)

#### 3. Require four Context dimensions in single-feature and Phase 2 synthesis

Update the `## Context` bullet in single-feature mode step 4 from the current terse "infer from the code's purpose. If unsure, flag it." to a structured requirement covering all four dimensions — each 1–3 substantive sentences drawn from code evidence: (1) Problem & motivation — what does this feature solve, why does it exist. (2) User/system impact — who uses it, what they can do, how it fits the larger product. (3) Key design decisions — the non-obvious choices and why this approach over alternatives. (4) Explicit out-of-scope — what this deliberately does not handle, inferred from feature boundaries and missing code paths. If a dimension can't be determined, state so explicitly rather than omitting it.

In Phase 2 step 4, expand the terse "inferred Context" reference to call out the same four-dimension requirement explicitly.

**Files:** `skills/adopt.md` (Behavior: Single-Feature Mode step 4 Context bullet; Behavior: Bulk Phase 2 step 4)

#### 4. Require developer-intent task titles and narrative detail blocks in single-feature and Phase 2 synthesis

Update the `## Plan` bullet in single-feature mode step 4 to specify: title is imperative mood expressing developer intent — no file paths or function names (good: "Implement UAC-safe elevated launch"; bad: "src/launch.rs: add ShellExecuteW"). Detail block is a short narrative paragraph explaining WHY this approach was chosen and HOW it works, including edge cases; file paths go at the end of the block, after the narrative.

Update Phase 2 step 4 to reference the same title and detail rules explicitly.

Add three new Hard rules:
- "Context completeness. Every adopted spec Context must address all four dimensions: problem & motivation, user/system impact, key design decisions, explicit out-of-scope."
- "Task title clarity. Task titles must express developer intent in imperative mood. No file paths, no function names in titles."
- "Task detail quality. Detail blocks explain WHY + HOW in narrative prose. File paths go at the end of the block, after the narrative."

**Files:** `skills/adopt.md` (Behavior: Single-Feature Mode step 4 Plan bullet; Behavior: Bulk Phase 2 step 4; Hard rules section)

#### 5. Sync updated skills/adopt.md to all existing installed copies

Per the Sync Rule in `principles.md`, run `node install.js` from the project root. The installer is idempotent and checks for existence before writing — it will not create directories that don't already exist. This syncs the rendered skill to all existing install roots: `.claude/commands/spek/adopt.md` (project-local Claude Code), `~/.claude/commands/spek/adopt.md` (global Claude Code), and any Codex/OpenCode installs that exist.

**Files:** via `node install.js` — rendered copies at all existing install roots

## Review

<!--
Written by spek:review. Fully rewritten on re-run.
This is the pre-execution design review checkpoint: findings, simpler alternatives,
missing dependencies, task ordering issues, and principle conflicts discovered after
Discussion and Plan are in place. spek:plan and spek:discuss may read this section
when the user returns to planning/discussion, but only spek:review rewrites it.
-->

**Summary:** The design is coherent and the Discussion decisions are well-grounded — principles inference approach (questions + inline code reads), detection heuristic (`<e.g.,`), and the four Context dimensions all hold up. One mandatory step is missing from the task list (sync to installed copies), and two secondary items need attention before execution is clean.

**Critical findings:**
- **No sync task (violates Sync Rule in principles.md).** All four tasks modify `skills/adopt.md` but none of them sync the change to installed copies (`.claude/commands/spek/adopt.md`, `~/.claude/commands/spek/adopt.md`, and any Codex packages). Principles.md states the Sync Rule is "mandatory, not optional," and names `node install.js` as the canonical mechanism. Add a task 5: "Sync updated `skills/adopt.md` to all existing installed copies via `node install.js`."

**Warnings:**
- **Principles inference scoping gap.** Task 1 adds inference only to Phase 1 (bulk path, after FEATURES.md is written). If a user runs single-feature adopt and `principles.md` is still template, no inference ever runs for that project. The Discussion section and Assumption 2 cover only "quality rules (Context dimensions + task format)" as applying equally to both modes; principles inference is deliberately Phase-1-only, but this isn't stated explicitly as an intentional exclusion. If it's intentional, add a sentence to Discussion noting why (e.g., single-feature mode lacks the codebase-scan context needed to infer conventions reliably). If it's not intentional, task 1 needs to extend the guard + inference logic to single-feature step 4 as well.
- **Docs evaluation absent.** Principles.md says: "During /spek:plan, always evaluate `docs/architecture.md`, `docs/maintenance.md`, and `docs/comparison.md` as candidate update targets." This spec adds significant new behavior to `spek:adopt` (principles inference, Context quality requirements, task format rules) — exactly the kind of change likely to affect `docs/architecture.md` (skill behavior reference) or `docs/maintenance.md` (change checklists). None of these docs appear in any task, and there is no note in Discussion that they were evaluated and deemed unchanged. Either add doc-update tasks or document the evaluation result in Discussion.

**Notes:**
- Tasks 3 and 4 both edit "single-feature step 4" and "Phase 2 step 4" in `skills/adopt.md`. They touch different bullets (`## Context` vs `## Plan`), so there's no content conflict — but the executor should re-read the file between task 3 and task 4 to avoid overwriting task 3's edits.
- The 37-line addition estimate is plausible (realistic range is ~25–46 net lines depending on how terse the wording is). The file stays comfortably under the ~300-line budget in all cases; no concern here.

**Recommended next move:** `spek:plan` — add the missing sync task (critical), resolve the principles-inference scoping question (warning), and document or add the docs-evaluation result (warning).

## Verification

**Task-by-task check:**
- Task 1 — Add principles inference step to single-feature mode and Phase 1: ✓ — step 2.5 added in single-feature (before folder creation), step 8.5 added in Phase 1 (after FEATURES.md, before STOP); both include guard, 3-question AskUserQuestion, inline code reads, synthesis, write (`skills/adopt.md` diff)
- Task 2 — Update Reads, Writes, Output to user, and Hard rules for principles inference: ✓ — Reads item 2 extended; Writes updated for both modes; "Principles:" output line added to both mode outputs; Hard rule added (`skills/adopt.md` diff)
- Task 3 — Require four Context dimensions in single-feature and Phase 2 synthesis: ✓ — single-feature step 4 Context bullet replaced with four-dimension requirement; Phase 2 step 4 expanded with explicit four-dimension call-out (`skills/adopt.md` diff)
- Task 4 — Require developer-intent task titles and narrative detail blocks + three Hard rules: ✓ — single-feature step 4 Plan bullet updated; Phase 2 step 4 cross-references Hard rules; three Hard rules appended (Context completeness, Task title clarity, Task detail quality) (`skills/adopt.md` diff)
- Task 5 — Sync updated skills/adopt.md to all existing installed copies: ✓ — `.claude/commands/spek/adopt.md` has identical diff applied (both 228 lines); `{{CMD_PREFIX}}` rendered to `/`; global `~/.claude/commands/spek/` not present, correctly skipped
- Fix (post-verify) — Extend principles.md ownership in docs/architecture.md: ✓ — `docs/architecture.md:133` now lists `/spek:adopt` alongside `/spek:kickoff` and `/spek:ingest`, with guard condition and inline-inference approach described (`docs/architecture.md` working-tree diff)

**Principles check:**
- Single-agent topology: ✓ — inference steps use inline reads only; no sub-agents spawned
- Section ownership: ✓ — only Behavior, Reads, Writes, Output to user, Hard rules sections touched in the skill file
- Document as state: ✓ — no new state files; principles.md write is explicitly conditional on absence/template
- Append-only execution log: ✓ — execution.md has only appended entries
- Skill under ~300 lines: ✓ — 228 lines, well under budget
- Documentation cascade: ✓ — `docs/architecture.md:133` updated to reflect `/spek:adopt` as a conditional writer of `principles.md`

**Assumptions check:**
- `skills/adopt.md` stays within ~300-line budget: ✓ confirmed — final file is 228 lines
- Same quality rules in both single-feature and Phase 2 modes: ✓ confirmed — both step 4s updated with identical requirements; no mode-specific exceptions
- `principles.md` with no `<e.g.,` strings = user-authored content: ⚠ unverifiable — design invariant; not checkable from code changes; accepted as given <!-- unverifiable: design invariant — cannot be verified by reading code; would require inspecting all possible template variants -->
- Principles inference must not spawn sub-agents: ✓ confirmed — both steps 2.5 and 8.5 specify "inline reads only"

**Goal check:** Both quality gaps are fully addressed. Gap 1 (principles.md left as template after bulk adoption): inference is now present in single-feature mode (step 2.5) and Phase 1 (step 8.5), guarded correctly, using AskUserQuestion + inline code reads + synthesis-to-write, without sub-agents. Gap 2 (shallow adopted spec quality): the four-dimension Context requirement and developer-intent task title / narrative detail-block rules are enforced in both single-feature step 4 and Phase 2 step 4, and backed by Hard rules. The architecture doc now correctly reflects the new writer. All out-of-scope items (FEATURES.md format unchanged, Phase 2 not altered beyond quality requirements) remain untouched.

**Issues found:**
None.

**Status:** READY_TO_SHIP

## Retrospective

<!--
Written by spek:retro. Fully rewritten on re-run.
This is the post-completion reflection: what changed, what surprised us, and what
should become a durable project principle. spek:retro may also propose principle
additions for user confirmation, but it owns only this section in spec.md.
-->
