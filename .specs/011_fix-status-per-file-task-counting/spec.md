---
id: "011"
title: Fix spek:status per-file task counting
created: 2026-04-11
status: done
starting_sha: 73b2f49
part_of: SpekLess
---

# Fix spek:status per-file task counting

> Part of [**SpekLess**](../project.md).

## Context

`/spek:status` displayed task counts (e.g. `11/11`) only for the last feature in the list — all other features showed blank in the Tasks column. The root cause: the skill instruction said "for each feature, count tasks" but did not explicitly forbid a single bulk Grep across all `spec.md` files. When executing the skill, Claude took the path of least resistance — one cross-file Grep call — and because `output_mode: count` returns a total aggregate rather than per-file breakdown, all task lines were effectively attributed to a single result. The final row rendered correctly by coincidence; every other row silently lost its count.

The fix is purely instructional: tighten `skills/status.md` in three places to make the per-file Grep requirement unambiguous and non-skippable.

## Discussion

**Why the skill text was ambiguous:** Step 2 of the All-features view read "For each, read frontmatter … and count … tasks." The "for each" implied individual reads but didn't prohibit a more efficient-looking single Grep. Claude optimized for fewer tool calls, which is correct behavior in general — just wrong here where per-file isolation is mandatory.

**Three-place fix:** The same constraint was added in `## Reads`, `## Behavior`, and `## Hard rules`. Redundancy is intentional: the rule needs to survive partial reads and future edits to any one section.

**Alternatives considered:** Switching to `output_mode: content` and parsing results by filename would also work, but is fragile — it depends on the Grep tool's output format staying stable. Per-file calls are simpler and more obviously correct.

**What this does NOT change:** No source code, no templates, no installer, no other skills. This is a documentation/instruction fix only.

**Sync rule obligation:** `skills/status.md` was modified. Per `principles.md`, the change must also be replicated to `.claude/commands/spek/status.md` (project-local install) and `~/.claude/commands/spek/status.md` (global install, if present). This was not done as part of the fix — it is flagged here as a gap for `/spek:verify` to catch.

## Plan

### Tasks

1. [x] Identify root cause of blank task counts
2. [x] Tighten `## Reads` in `skills/status.md`
3. [x] Tighten `## Behavior` step 2 in `skills/status.md`
4. [x] Add `## Hard rules` entry "Per-file Grep, never bulk"
5. [x] Sync updated `status.md` to installed copies

### Task details

#### 1. Identify root cause of blank task counts
- **Files:** `skills/status.md`
- **Approach:** The screenshot showed `11/11` only for feature 010; all others blank. Traced to the `## Behavior` instruction permitting a single cross-file Grep. `output_mode: count` aggregates across files — per-file breakdown is lost.

#### 2. Tighten `## Reads` in `skills/status.md`
- **Files:** `skills/status.md`
- **Approach:** Replaced the generic checkbox-grep description with an explicit constraint: "Each spec file must be Grep'd individually — one Grep call per file, scoped to that file's path. Never use a single Grep across all spec files; results bleed across files and the per-feature counts will be wrong."

#### 3. Tighten `## Behavior` step 2 in `skills/status.md`
- **Files:** `skills/status.md`
- **Approach:** Rewrote step 2 of the All-features view to be prescriptive: name the per-file Grep call as a concrete instruction, include the two patterns (`\d+\. \[.\]` for total, `\d+\. \[x\]` for done), and explicitly prohibit a single bulk Grep with a reason ("results will bleed across features").

#### 4. Add `## Hard rules` entry "Per-file Grep, never bulk"
- **Files:** `skills/status.md`
- **Approach:** Appended a new Hard rule bullet: "Task counts MUST come from individual Grep calls scoped to each spec.md. A bulk Grep across all spec files will produce wrong counts — only the last file's tasks will be attributed correctly." Reinforces the constraint at the rule level so it survives edits to prose sections.

#### 5. Sync updated `status.md` to installed copies
- **Files:** `.claude/commands/spek/status.md`, `~/.claude/commands/spek/status.md` (if exists)
- **Approach:** Copy `skills/status.md` to `.claude/commands/spek/status.md`. Check whether `~/.claude/commands/spek/` exists; if so, copy there too. Required by the Sync Rule in `principles.md` — any modification to `skills/` must be reflected in installed copies immediately. **This task was NOT completed during the fix session and is the only unchecked item.**

## Verification

**Task-by-task check:**
- Task 1 — Identify root cause: ✓ — Context and Discussion sections document the cause accurately (bulk Grep + `output_mode: count` aggregation)
- Task 2 — Tighten `## Reads`: ✓ — `skills/status.md` Reads item 3 now explicitly requires per-file Grep and prohibits bulk cross-file Grep
- Task 3 — Tighten `## Behavior` step 2: ✓ — Behavior step 2 is now prescriptive: separate Grep call per file, concrete patterns, explicit prohibition with reason
- Task 4 — Add Hard rules entry: ✓ — New bullet "Per-file Grep, never bulk" appended to Hard rules section
- Task 5 — Sync to installed copies: ✓ — `skills/status.md` and `.claude/commands/spek/status.md` are byte-for-byte identical; `~/.claude/commands/spek/` does not exist, so no global sync needed

**Principles check:**
- Code Style (skill files standard sections order): ✓ — No section order was changed; only content within existing sections was modified
- Code Style (skill files under ~300 lines): ✓ — `skills/status.md` is 87 lines, well within limit
- Section ownership: ✓ — This is a skill file edit, not a spec.md section ownership concern
- Sync Rule: ✓ — Both `skills/status.md` and `.claude/commands/spek/status.md` carry identical changes; global install absent

**Goal check:** The stated goal was to eliminate blank task counts in `/spek:status` output for all features except the last. The fix is purely instructional — tightening three places in `skills/status.md` (Reads, Behavior step 2, Hard rules) to make per-file Grep non-skippable. The Discussion section confirms no source code, templates, installer, or other skills were in scope. The implementation matches that scope exactly. Task 5's checkbox was left unchecked in the Plan but the sync was in fact completed — both files are identical and the global install path does not exist.

**Issues found:**
- Task 5 checkbox (`[ ]`) is unchecked in `## Plan → ### Tasks` despite the work being done — `skills/status.md` and `.claude/commands/spek/status.md` are identical. Minor tracking inconsistency; no functional impact.

**Status:** READY_TO_SHIP
