---
id: "014"
title: Include a Type column in the spek:status skill's output
type: quick
status: done
starting_sha: 142a1cb142cc43d8097f44c62e40159592251c33
created: 2026-04-12
tags: []
---

# Include a Type column in the spek:status skill's output

## Context

The `spek:status` all-features table currently shows ID, Title, Status, Tasks, and Part of. There is no way to tell at a glance whether a spec was produced by `/spek:quick`, `/spek:adopt`, `/spek:new` (standard), or imported as a migration. Adding a Type column — sourced from the `type` frontmatter field — makes the table immediately more informative, especially in larger projects where quick specs coexist with full-workflow specs.

## Plan

### Tasks

1. [x] Update the table schema and read instructions in `skills/status.md`
2. [x] Sync the updated file to `.claude/commands/spek/status.md`

### Details

#### 1. Update the table schema and read instructions in `skills/status.md`

**Files:** `skills/status.md`

**Approach:** In the Reads section, note that the `type` frontmatter field should be extracted (defaulting to `standard` when absent). In the Behavior section, add a `Type` column after `Status` in the table, and update the example table to show values like `standard`, `quick`, `adopted`, `migrated`.

#### 2. Sync the updated file to `.claude/commands/spek/status.md`

**Files:** `.claude/commands/spek/status.md`

**Approach:** Copy the updated `skills/status.md` verbatim to `.claude/commands/spek/status.md` per the Sync Rule in principles.md.

## Verification

<!--
Written by /spek:verify. Fully rewritten on re-run.
-->

**Task-by-task check:**
- Task 1 — Update table schema and read instructions in `skills/status.md`: ✓ — Reads section now lists `type` extraction with `standard` default; Behavior step 2 updated to extract `type`; example table gains `Type` column between `Status` and `Tasks` (skills/status.md, lines 20 and 31–44)
- Task 2 — Sync to `.claude/commands/spek/status.md`: ✓ — Files are byte-for-byte identical (`diff` produces no output); both 87 lines

**Principles check:**
- Code Style (skill under ~300 lines): ✓ — skills/status.md is 87 lines, well within budget
- Architecture (single-agent topology): ✓ — no sub-agents spawned; execute ran inline as expected for a 2-task quick feature
- Architecture (section ownership): ✓ — only Reads and Behavior sections touched; Hard rules unchanged
- Architecture (document as state): ✓ — no external state files introduced
- Sync Rule: ✓ — skills/status.md and .claude/commands/spek/status.md are identical; global install absent (skipped per execution log)
- Security: ✓ — no secrets or config changes

**Goal check:** The Context states the goal is to add a `Type` column to the all-features table, sourced from the `type` frontmatter field, defaulting to `standard` when absent. The diff achieves exactly this: both the Reads instruction (extraction + default) and the Behavior table example are updated consistently. The single-feature detail view was not in scope and was not touched. Goal fully achieved.

**Issues found:** None.

**Status:** READY_TO_SHIP
