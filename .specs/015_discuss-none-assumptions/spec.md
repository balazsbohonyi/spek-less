---
id: "015"
title: Write "None." in Assumptions section when /spek:discuss finds no assumptions
type: quick
status: done
starting_sha: 93ede681f4c2ddca4821eb125cc91b9edc6cc8d3
created: 2026-04-12
tags: []
---

# Write "None." in Assumptions section

Write "None." in Assumptions section when /spek:discuss finds no assumptions

## Context

Currently, when `/spek:discuss` runs and the user states no assumptions, it writes the `## Assumptions` section with only the HTML comment block, leaving the visible body empty. This is inconsistent with how the `### Open questions` subsection handles the same situation (writing "None." + a short explanation), and the bare comment is noisy without being informative. The fix is to change the instruction in `skills/discuss.md` so that the skill writes `None.` followed by a short sentence when no assumptions were raised — and to sync that change to the installed copies per the Sync Rule.

## Plan

### Tasks

1. [x] Update the Assumptions-writing instruction in `skills/discuss.md`
2. [x] Sync the change to installed copies

### Details

#### 1. Update the Assumptions-writing instruction in `skills/discuss.md`

**Files:** `skills/discuss.md`

**Approach:** Change the instruction at line 71 from "write the section with only the HTML comment" to "write `None.` + a one-sentence note that no external bets were identified" when the user had no assumptions.

#### 2. Sync the change to installed copies

**Files:** `.claude/commands/spek/discuss.md`, `~/.claude/commands/spek/discuss.md` (if exists)

**Approach:** Replicate the identical edit to both installed copies per the Sync Rule in `principles.md`.

## Verification

<!--
Written by /spek:verify. Fully rewritten on re-run.
-->

**Task-by-task check:**
- Task 1 — Update Assumptions instruction in `skills/discuss.md`: ✓ — line 71 replaced "write the section with only the HTML comment" with `None.` + sample sentence instruction; explicit prohibition added
- Task 2 — Sync to installed copies: ✓ — identical edit in `.claude/commands/spek/discuss.md`; global install confirmed absent, correctly skipped

**Principles check:**
- Sync Rule: ✓ — both `skills/discuss.md` and `.claude/commands/spek/discuss.md` carry the same change; global install absent
- Skill file length: ✓ — one-line substitution, no length regression
- HTML comments principle: ✓ — change removes the bare-comment case, consistent with keeping HTML comments as guidance only

**Goal check:** Context asked for `None.` + a short sentence when no assumptions are raised, consistent with how `### Open questions` handles the same case. The diff delivers exactly this: the new instruction writes `None.` plus an adaptable sample sentence and explicitly prohibits the bare-comment fallback. Both skill source and installed copy updated. Goal achieved.

**Issues found:** None.

**Status:** READY_TO_SHIP
