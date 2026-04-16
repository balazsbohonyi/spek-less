---
id: "023"
title: Line-anchored grep and markdown table in spek:status
type: quick
status: done
part_of: SpekLess
starting_sha: 502750e
created: 2026-04-17
tags: []
---

# Line-anchored grep and markdown table in spek:status

## Context

Two problems in `skills/status.md`:

1. **False positive task counts.** The two bulk-Grep patterns (`\d+\. \[.\]` and `\d+\. \[x\]`) are not line-anchored, so they match numbered-checkbox syntax appearing mid-line in prose or code spans. Spec 020 line 19 contains `1. [ ] <short task title>` inside a backtick-enclosed description of the problem, causing the total count to report 5 instead of 4.

2. **Non-markdown table format.** The example table uses ASCII-art separators (`------+`) inside a code block, which renders as plain text in any markdown viewer instead of a proper markdown pipe table.

## Assumptions

None.

## Plan

### Tasks

1. [x] Line-anchor the grep patterns in `skills/status.md`
2. [x] Replace ASCII-art table with markdown pipe table in `skills/status.md`
3. [x] Sync changes to all installed copies

### Details

#### 1. Line-anchor the grep patterns in `skills/status.md`

**Files:** `skills/status.md`

**Approach:** In three locations (Reads item 3, Behavior step 2, Hard rules last entry), change the grep patterns from `\d+\. \[.\]` / `\d+\. \[x\]` to `^\d+\. \[.\]` / `^\d+\. \[x\]`. The `^` start-of-line anchor ensures only lines beginning with a numbered checkbox are counted, eliminating false positives from checkbox-like syntax embedded mid-line in prose.

#### 2. Replace ASCII-art table with markdown pipe table in `skills/status.md`

**Files:** `skills/status.md`

**Approach:** In Behavior step 4, replace the code-block-wrapped ASCII-art table examples (using `------+` separators) with proper markdown pipe tables using `| --- |` separator rows. Remove the enclosing code fence. Two example tables are affected: the "siblings exist" variant (6 columns) and the "no siblings" variant (5 columns).

#### 3. Sync changes to all installed copies

**Files:** `.claude/commands/spek/status.md`, `.opencode/commands/spek/status.md`, `.codex/skills/spek-status/SKILL.md`

**Approach:** Apply the same three edits to each installed copy, respecting each agent's render rules. For Claude Code and OpenCode, `{{CMD_PREFIX}}` is rendered as `/`. For Codex, `spek:<skill>` references are rendered as `spek-<skill>`.

## Verification

**Task-by-task check:**
- Task 1 — Line-anchor the grep patterns in `skills/status.md`: ✓ — `^` anchor added in all 3 locations (Reads item 3 line 21, Behavior step 2 lines 30-31, Hard rules line 100) in all 4 copies
- Task 2 — Replace ASCII-art table with markdown pipe table in `skills/status.md`: ✓ — code fence removed; both sibling and no-sibling example tables now use `| --- |` separator rows in all 4 copies
- Task 3 — Sync changes to all installed copies: ✓ — `.claude/commands/spek/status.md`, `.opencode/commands/spek/status.md`, and `.codex/skills/spek-status/SKILL.md` all carry identical substantive changes; only differences are correct render rules (`{{CMD_PREFIX}}` → `/` for Claude/OpenCode, `spek-` prefix for Codex); no global installs exist

**Principles check:**
- Code Style (skill under ~300 lines): ✓ — skills/status.md is 103 lines, well within budget
- Architecture (section ownership): ✓ — only Reads, Behavior, and Hard rules sections touched; all owned by status skill
- Sync Rule: ✓ — all 4 installed copies updated; no global installs present (checked `~/.claude/`, `~/.codex/`, `~/.config/opencode/`)
- Command References: ✓ — Codex copy uses `spek-<skill>` and `$` prefix; Claude/OpenCode copies use `/spek:<skill>`; source uses `{{CMD_PREFIX}}spek:<skill>`

**Goal check:** Context states two goals: (1) eliminate false-positive task counts from mid-line checkbox patterns, and (2) render the example table as valid markdown. The `^` anchor in all grep patterns achieves goal 1 — confirmed by running anchored grep on spec 020 which now correctly returns 4/4 instead of 5. The markdown pipe table format with removed code fence achieves goal 2. Both goals fully met.

**Issues found:** None.

**Status:** READY_TO_SHIP
