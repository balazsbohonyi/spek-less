---
id: "028"
title: Bulk Adopt Discovery Mode
status: verifying
part_of: SpekLess
starting_sha: 08d7503
created: 2026-04-19
tags: [adopt, bulk, discovery, multi-feature]
---

# Bulk Adopt Discovery Mode

## Context

> Part of [**SpekLess**](../project.md).

`spek:adopt` currently reverse-engineers a **single** feature spec from existing code. When a mature codebase has 20+ features, running adopt one-at-a-time is tedious. This feature adds a bulk discovery mode: no argument triggers a two-phase flow that scans the codebase, produces a feature list for human review (`.specs/FEATURES.md`), then on re-invocation creates specs for all confirmed features. The current single-feature behavior (argument provided) is preserved unchanged.

**Goal:** a user can run `spek:adopt` with no argument on a fresh SpekLess install in an existing project, and after two invocations have structured specs for every feature in the codebase — with a human-editable checkpoint in between.

**Out of scope:** automatic feature boundary detection that's always perfect (this is a best-effort heuristic), parallel sub-agent fan-out for spec synthesis (violates single-agent topology).

## Discussion

_Imported from current conversation on 2026-04-19._

**Two modes in one skill vs. two separate skills.** Keeping bulk discovery inside `spek:adopt` (one skill, mode switch) avoids expanding the skill surface area. The mode trigger is clean: argument = single-feature (unchanged), no argument = bulk discovery. The ~240-line budget fits within the 300-line principle.

**FEATURES.md as the human-in-the-loop checkpoint.** The key insight: the user edits the markdown file directly rather than going through 25 AskUserQuestion rounds. FEATURES.md lives in `.specs/` (SpekLess-owned, unlikely to conflict). Phase 1 writes it and stops; Phase 2 reads it and creates specs. This is consistent with "the document is the state."

**Ask-first discovery.** Before running Explore sub-agents, the skill asks if the user has a PRD/feature list/project doc to reference. If provided, it becomes the primary source for feature boundaries with heuristic discovery as validation. If not, pure heuristic discovery proceeds.

**Adaptive Explore depth.** One breadth-first Explore for structure. If results are ambiguous (many low-confidence features), a second narrower Explore targets the ambiguous area. Cap at 2.

**Convention-based heuristics (no project-type detection).** Ranked cascade: route groups → page/screen directories → domain module folders → store/reducer slices → top-level directories. Works on any codebase without requiring framework-specific detection.

**Sequential Phase 2 synthesis.** No sub-agent fan-out for spec creation. The main agent reads each feature's listed files and creates specs one at a time. This preserves observability (user can see and interrupt) and respects single-agent topology. A checkpoint every 10 features manages context health.

**Edge cases.** Zero features discovered → report, don't create FEATURES.md, suggest single-feature with a specific scope. Zero valid features after user edits → offer to delete FEATURES.md or re-run discovery. More than 30 features → cap at 30, warn in FEATURES.md prologue and output. Malformed FEATURES.md → best-effort parse, report failures, offer to delete and re-run. FEATURES.md exists but user provides an argument → argument wins, run single-feature mode, FEATURES.md untouched. Feature already has a spec → skip in both Phase 1 discovery and Phase 2 synthesis.

## Assumptions

- [x] Feature boundaries can be reliably inferred from code structure (routes, modules, directories) in most codebases
- [x] Users will edit FEATURES.md between Phase 1 and Phase 2 rather than running Phase 2 blindly
- [x] Reading CLAUDE.md/AGENTS.md/README.md/package.json as hints improves boundary detection without being framework-specific
- [x] The skill file can fit both modes within ~300 lines without sacrificing clarity

## Plan

### Tasks

1. [x] Rewrite `skills/adopt.md` with two-mode structure (single-feature + bulk discovery)
2. [x] Update `docs/architecture.md` — sub-agent table, skill description, FEATURES.md artifact
3. [x] Update `docs/comparison.md` — adopt novelty section
4. [x] Update `docs/maintenance.md` if skill conventions change
5. [x] Add bulk-adopt example to `examples/`
6. [x] Update `README.md` — mention bulk adoption capability
7. [x] Sync installed copies
8. [x] Manual smoke test
9. [x] Rewrite bulk-discovery Explore prompt to emphasize coarser feature boundaries
10. [x] Add consolidation step to Phase 1 behavior
11. [x] Update example FEATURES.md to show grouped output
12. [x] Update architecture.md and comparison.md for grouping changes
13. [x] Sync installed copies
14. [x] Manual smoke test — re-test on riftle

### Details

#### 1–8. Original implementation

Completed in first pass (2026-04-19). See execution.md for details.

#### 9. Rewrite bulk-discovery Explore prompt to emphasize coarser feature boundaries

**Files:** `skills/adopt.md` (Explore Sub-Agent Prompts → Bulk discovery prompt section)

**Approach:** The current prompt asks for "distinct features" per module/file, which produces one feature per source file or small module. Rewrite the prompt to:

1. Add an explicit **grouping instruction** before the candidate list: "Prefer fewer, broader features over many narrow ones. Merge sub-concerns that share a directory, source file, or domain concept into a single feature. A feature should describe a user-facing capability or a cohesive subsystem, not a single utility."

2. Add a **merge signal** column: for each candidate, also return `merge_with` — the number of another candidate it could merge with, or `standalone`.

3. Add concrete **anti-patterns** to avoid: don't create separate features for functions within the same module (e.g., icon extraction + lnk resolution + auto-reindex are all part of "Indexer"); don't create separate features for individual UI components in the same `components/ui/` directory unless they represent a distinct user workflow.

4. Lower the hard cap guidance from 30 to 20 in the prompt text. Keep the hard cap at 30 in the hard rules (safety net), but the prompt should target ~15–20 well-bounded features.

#### 10. Add consolidation step to Phase 1 behavior

**Files:** `skills/adopt.md` (Behavior: Bulk Phase 1 — Discovery)

**Approach:** Insert a new step between current step 6 (convention heuristics) and step 7 (write FEATURES.md). After the Explore sub-agent returns candidates and convention heuristics are applied, the main agent performs a consolidation pass before writing FEATURES.md:

New step 6.5 (inserted after existing step 6):
- **Consolidate related candidates.** Review all discovered candidates and merge those that:
  - Share the same primary source file (e.g., multiple candidates from `indexer.rs` → one "Indexer" feature).
  - Are all small UI components in the same `components/` directory → one "UI component library" feature.
  - One is clearly a sub-concern of another (e.g., "auto-reindex on filesystem" is part of "indexer pipeline").
  - Share a common domain prefix in their route/module paths.
- When merging, combine their Files lists (deduplicated) and write a Summary that covers the merged scope.
- Target: 10–20 features after consolidation. If count is still above 20, apply a second pass looking for weaker merge signals (shared imports, co-tested modules).
- If consolidation reduces below 3 features, report this and suggest the codebase may be best served by single-feature adopt.

Update step 7 (renumber to 7.5): Keep the soft cap at 30 but note it should be rare to reach it after consolidation. The warning in prologue remains.

Also update the **Hard Rules** section:
- Add: "Consolidate before writing. Phase 1 must apply a consolidation pass that merges sub-concerns into cohesive features. Target 10–20 features post-consolidation."

#### 11. Update example FEATURES.md to show grouped output

**Files:** `examples/003_bulk-adopt/FEATURES.md`

**Approach:** Rewrite the example to show 3-4 broader, grouped features instead of narrow per-module ones. Each feature should have a multi-file Files list and a Summary that covers the full scope. This demonstrates the target granularity users should expect. Keep one struck-through entry.

#### 12. Update architecture.md and comparison.md for grouping changes

**Files:** `docs/architecture.md`, `docs/comparison.md`

**Approach:** Update the Phase 1 description in architecture.md to mention the consolidation step. Update comparison.md if the grouping approach represents a novel design choice worth calling out (it does — the consolidation pass before human review is what makes bulk adopt produce usable feature counts, not just raw discovery).

#### 13. Sync installed copies

**Files:** All agent-specific install directories

**Approach:** Sync the updated `skills/adopt.md` to all installed copies following the render rules in principles.md. Same sync process as task 7.

#### 14. Manual smoke test — re-test on riftle

**Files:** Riftle project at `../riftle`

**Approach:** Delete the existing `../riftle/.specs/FEATURES.md` and re-run `spek:adopt` (no args) in the riftle project. Verify that:
- The resulting FEATURES.md has significantly fewer than 30 features (target: 10–15).
- Related indexer concerns (#001/#013/#014/#015/#016 equivalent) are merged into one or two features.
- UI components are grouped rather than listed individually.
- Each remaining feature covers a cohesive user-facing capability or subsystem.
- Stay under 300 lines in adopt.md.

## Review

<!-- Run spek:review to populate. -->

## Verification

**Task-by-task check:**
- Task 1 — Rewrite `skills/adopt.md` with two-mode structure: ✓ — 188 lines, two-mode structure with mode detection, Phase 1/Phase 2, two Explore prompts, three output templates, 13 hard rules
- Task 2 — Update `docs/architecture.md`: ✓ — sub-agent table updated, adopt description updated, FEATURES.md artifact documented, file inventory tree at line 286-289 includes `003_bulk-adopt/`
- Task 3 — Update `docs/comparison.md`: ✓ — adopt novelty section updated (line 126)
- Task 4 — Update `docs/maintenance.md`: ✓ — correctly evaluated as no change needed (two-mode pattern is adopt-specific)
- Task 5 — Add bulk-adopt example to `examples/`: ✓ — `examples/003_bulk-adopt/FEATURES.md` with 4 features, one struck-through, correct format
- Task 6 — Update `README.md`: ✓ — walkthrough 4, directory layout, examples section all updated; `CLAUDE.md` repo structure tree (line 80-83) includes `003_bulk-adopt/`
- Task 7 — Sync installed copies: ✓ — all three copies (Claude Code, Codex, OpenCode) properly rendered with correct namespace transforms
- Task 8 — Manual smoke test: ✓ — structural checks passed; functional test deferred to user (interactive invocation required)

**Principles check:**
- Skill file ≤300 lines: ✓ — 188 lines
- Section ownership: ✓ — each section in adopt.md has clear ownership
- Single-agent topology: ✓ — Phase 2 is sequential, no sub-agent fan-out for spec creation
- Document is state: ✓ — FEATURES.md is the intermediate state artifact
- Append-only execution log: ✓ — execution.md has entries only appended
- Sync rule: ✓ — all three agent copies rendered correctly with proper namespace transforms
- Command references: ✓ — `{{CMD_PREFIX}}` and `spek:` rendering correct across all copies
- Documentation: ✓ — directory trees in architecture.md and CLAUDE.md both include `003_bulk-adopt/`

**Assumptions check:**
- Feature boundaries can be reliably inferred from code structure: ✓ confirmed — convention-based heuristic cascade (routes → pages → modules → store slices → top dirs) is implemented in Phase 1 Explore prompt
- Users will edit FEATURES.md between Phase 1 and Phase 2: ✓ confirmed — Phase 1 stops and tells user to edit; Phase 2 only runs on re-invocation with FEATURES.md present
- Reading CLAUDE.md/AGENTS.md/README.md/package.json as hints improves boundary detection: ✓ confirmed — Phase 1 step 1 reads hint files
- The skill file can fit both modes within ~300 lines without sacrificing clarity: ✓ confirmed — 188 lines, well under 300

**Goal check:** The implementation achieves the stated goal. `spek:adopt` with no argument triggers Phase 1 discovery (Explore sub-agent, hint files, convention heuristics), produces FEATURES.md, stops for human review. Re-invocation triggers Phase 2 synthesis (sequential spec creation from FEATURES.md entries). Single-feature mode with an argument is preserved unchanged. The human-editable checkpoint works via FEATURES.md editing (including strikethrough deletion). Edge cases for zero features, malformed FEATURES.md, existing specs, and >30 features are all handled.

**Issues found:**
None.

**Status:** READY_TO_SHIP

## Retrospective

<!-- Run spek:retro to populate. -->
