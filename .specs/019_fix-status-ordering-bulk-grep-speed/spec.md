---
id: "019"
title: "Fix /spek:status — ordering and bulk-Grep speed"
status: done
type: standard
part_of: SpekLess
created: 2026-04-14
starting_sha: 59c4579
---

# Fix /spek:status — ordering and bulk-Grep speed

## Context

> Part of [**SpekLess**](../project.md).

`/spek:status` has two bugs:

1. **Non-deterministic ordering.** The skill says "sort parent specs first" but never specifies direction. The model freely picks ascending or descending on each invocation, so the output order is random across runs.

2. **Slow execution.** The skill mandates one Grep call per spec file for total checkboxes, and another for done checkboxes — 2N sequential tool calls for N specs. This is the primary performance bottleneck for projects with many specs.

Only one file changes: `skills/status.md`. Per the Sync Rule in `principles.md`, the change must also be replicated to `.claude/commands/spek/status.md` and `~/.claude/commands/spek/status.md` (if the global install directory exists).

## Discussion

_Imported from docs/plan-status-fixes.md on 2026-04-14._

The two fixes are independent but both touch `skills/status.md`. They are applied together in a single editing pass (6 targeted edits).

**Fix 1 — Ordering:** The Reads section and Behavior step 4 say "sort parent specs first" and "order siblings by `.N` suffix" without specifying direction. Adding explicit direction words ("descending" for parents, "ascending" for siblings) eliminates the ambiguity that causes random ordering.

**Fix 2 — Bulk-Grep:** The existing instruction mandates per-file Greps ("one Grep call per file, scoped to that file's path") to avoid cross-file bleed. This was correct reasoning at the time — a single `count`-mode Grep can't attribute lines to files. However, `files_with_matches` + `content` mode Greps return `filename:line` pairs that _can_ be grouped by path, making two bulk Greps across all spec files both correct and O(1) in tool-call count.

The plan combines Edit A (ordering note in Reads) and Edit D (bulk-Grep instruction in Reads) into a single line rewrite since both target the same line.

## Assumptions

- [x] `skills/status.md` uses the exact text strings shown in the plan's "Replace:" blocks. If the file has drifted, edits must be adjusted to match the current text.
- [ ] The global install at `~/.claude/commands/spek/status.md` uses the same text (copied from `skills/status.md` by a prior sync). If not, sync still applies but may need independent editing. <!-- unverifiable: global install dir ~/.claude/commands/spek/ does not exist on this machine; sync was correctly skipped per plan -->

## Plan

### Goal

Fix `/spek:status` so that (a) output order is deterministic across runs, (b) checkbox counting uses two bulk Greps instead of 2N per-file Greps, and (c) the "Part of" column is omitted when no sibling specs exist.

### Tasks

- [x] 1. Edit A+D — Rewrite Reads item 3 in `skills/status.md`: replace the "per-file Grep" mandate with the two-bulk-Grep instruction and add the ordering note
- [x] 2. Edit B — In Behavior step 4, replace "sort parent specs first" with "sort parent specs in **descending** numeric order … highest `NNN` first"
- [x] 3. Edit C — After the table example, replace "Order siblings by their `.N` suffix" with "… in **ascending** order (016.1 before 016.2)"
- [x] 4. Edit E — In Behavior step 2, replace the per-file Grep loop with the two-bulk-Grep procedure (Grep 1: all checkboxes; Grep 2: done checkboxes; group by file path)
- [x] 5. Edit F — In Hard rules, replace "Per-file Grep, never bulk" with "Two bulk Greps, never per-file"
- [x] 6. Edit G — In Behavior step 4, add sibling-detection logic and conditional "Part of" column; update the table example to show both the with-siblings and no-siblings variants
- [x] 7. Sync — Copy the updated `skills/status.md` to `.claude/commands/spek/status.md`; if `~/.claude/commands/spek/` exists, copy there too

### Details

**Task 1 — Edit A+D (combined line rewrite)**

File: `skills/status.md`

Replace:
```
3. **All `.specs/NNN_*/spec.md` and `.specs/NNN.M_*/spec.md`** — read ONLY frontmatter and the `### Tasks` subsection. **Each spec file must be Grep'd individually** — one Grep call per file, scoped to that file's path. Never use a single Grep across all spec files; results bleed across files and the per-feature counts will be wrong. Match checkbox lines with `\d+\. \[.\]` (total) and `\d+\. \[x\]` (done). Extract `id`, `title`, `status`, `type`, and `part_of` from frontmatter. When `type` is absent, treat it as `standard`. Never read Context, Discussion, Details, or Verification.
```

With:
```
3. **All `.specs/NNN_*/spec.md` and `.specs/NNN.M_*/spec.md`** — read ONLY frontmatter and the `### Tasks` subsection. Use **two bulk Greps** across all spec files: one matching `\d+\. \[.\]` (total checkboxes) and one matching `\d+\. \[x\]` (done checkboxes). Both Greps return `filename:line` pairs — group results by file path to compute per-feature counts. Extract `id`, `title`, `status`, `type`, and `part_of` from frontmatter. When `type` is absent, treat it as `standard`. Never read Context, Discussion, Details, or Verification.
```

---

**Task 2 — Edit B (Behavior step 4)**

File: `skills/status.md`

Replace:
```
sort parent specs first (those without a `.` in the `id`),
```

With:
```
sort parent specs in **descending** numeric order (those without a `.` in the `id`, highest `NNN` first),
```

---

**Task 3 — Edit C (after-table ordering line)**

File: `skills/status.md`

Replace:
```
Order siblings by their `.N` suffix.
```

With:
```
Order siblings by their `.N` suffix in **ascending** order (016.1 before 016.2).
```

---

**Task 4 — Edit E (Behavior step 2)**

File: `skills/status.md`

Replace:
```
2. For each feature directory, make a **separate Grep call scoped to that feature's `spec.md`** to count checkbox lines. Do NOT use a single bulk Grep across all spec files — results will bleed across features. Concretely: for each `spec.md`, grep that file individually for lines matching `\d+\. \[.\]` to get total, and `\d+\. \[x\]` to get done count. Extract `id`, `title`, `status`, `type`, `part_of` from that same file's frontmatter. When `type` is absent, display `standard`.
```

With:
```
2. Gather checkbox counts with exactly **two bulk Greps** across `<specs_root>/`:
   - Grep 1: pattern `\d+\. \[.\]` — all checkbox lines (total). Results come back as `path/to/NNN_foo/spec.md:line`. Group by file path.
   - Grep 2: pattern `\d+\. \[x\]` — done checkbox lines only. Group by file path.
   Per-feature task count = (lines from Grep 1 for that file) / (lines from Grep 2 for that file).
   Read each `spec.md`'s frontmatter to extract `id`, `title`, `status`, `type`, `part_of`. When `type` is absent, display `standard`.
```

---

**Task 5 — Edit F (Hard rules)**

File: `skills/status.md`

Replace:
```
- **Per-file Grep, never bulk.** Task counts MUST come from individual Grep calls scoped to each `spec.md`. A bulk Grep across all spec files will produce wrong counts — only the last file's tasks will be attributed correctly.
```

With:
```
- **Two bulk Greps, never per-file.** Use exactly two Greps across all spec files (one for `\[.\]`, one for `\[x\]`), then group results by file path. Per-file Greps are correct but slow — they scale as 2N tool calls and should not be used.
```

---

**Task 6 — Edit G (conditional "Part of" column)**

File: `skills/status.md`

After collecting all specs and their frontmatter (end of step 2 / start of step 4), add sibling-detection logic:

A spec is a **sibling** if its `part_of` value matches the `id` of at least one other spec in the loaded collection. Determine whether **any** sibling relationships exist. This flag controls the "Part of" column for the entire table render:

- **No sibling relationships:** omit the "Part of" column entirely — don't include it in the header row or any data row.
- **At least one sibling relationship:** include the "Part of" column. Sibling rows show their `part_of` value; all other rows show "—".

Replace the single table example block in step 4 with two variants:

```
When siblings exist:

  ID    | Title                    | Status     | Type     | Tasks | Part of
  ------+--------------------------|------------|----------|-------|--------
> 016   | Big Feature              | decomposed | standard |  —    |
  ↳016.1| Auth sessions            | done       | standard |  4/4  | 016
  ↳016.2| Token refresh            | planning   | standard |  0/3  | 016
  003   | Add dark mode toggle     | executing  | quick    |  2/4  | —
  001   | Auth rewrite             | verifying  | adopted  |  3/3  | —

When no siblings exist (omit column):

  ID  | Title                    | Status     | Type     | Tasks
  ----+--------------------------|------------|----------|------
> 003 | Add dark mode toggle     | executing  | quick    |  2/4
  001 | Auth rewrite             | verifying  | adopted  |  3/3

> = current feature (resolved from git branch)
```

---

**Task 7 — Sync**

After all edits to `skills/status.md` are complete:
1. Copy to `.claude/commands/spek/status.md` (always present in this repo).
2. Check if `~/.claude/commands/spek/` exists; if so, copy there too.

## Verification

**Task-by-task check:**
- Task 1 — Edit A+D (Reads item 3 rewrite): ✓ — `skills/status.md` Reads item 3 replaced; per-file Grep mandate gone, two-bulk-Grep instruction present (diff line ~21)
- Task 2 — Edit B (descending parent order): ✓ — "sort parent specs in **descending** numeric order … highest `NNN` first" confirmed in Behavior step 4 (diff line ~29)
- Task 3 — Edit C (ascending sibling suffix): ✓ — "ascending order (016.1 before 016.2)" confirmed after table block (diff line ~55)
- Task 4 — Edit E (Behavior step 2 bulk-Grep): ✓ — two-bullet bulk-Grep procedure replaces per-file loop (diff lines ~30–35)
- Task 5 — Edit F (Hard rules rewrite): ✓ — "Two bulk Greps, never per-file" confirmed (diff line ~102)
- Task 6 — Edit G (conditional "Part of" column): ✓ — sibling-detection paragraph + two table variants (with/without) confirmed (diff lines ~36–54)
- Task 7 — Sync to `.claude/commands/spek/status.md`: ✓ — diff shows identical changes in both `skills/status.md` and `.claude/commands/spek/status.md`; global install skipped (dir absent)

**Principles check:**
- Single-agent topology: ✓ — no sub-agents spawned; all edits made in main conversation
- Section ownership: ✓ — only `skills/status.md` (and its synced copy) modified
- Document is the state: ✓ — no STATE.md or lockfiles created
- Append-only execution log: ✓ — execution.md contains only appended entries
- Skills under ~300 lines: ✓ — net addition is ~13 lines; file is well under the limit
- Sync Rule: ✓ — `skills/status.md` → `.claude/commands/spek/status.md` synced; global install correctly skipped (dir absent)

**Assumptions check:**
- `skills/status.md` uses the exact text strings shown in the plan's "Replace:" blocks: ✓ confirmed — all six edits applied cleanly; no adjustment required
- Global install uses the same text: ⚠ unverifiable — `~/.claude/commands/spek/` does not exist on this machine; sync was correctly skipped per plan

**Goal check:** The implementation fully achieves all three goals stated in the Plan: (a) ordering is now deterministic — parents descend numerically, siblings ascend by suffix; (b) checkbox counting now uses two bulk Greps (O(1) tool calls) instead of 2N per-file Greps; (c) the "Part of" column is conditionally omitted when no sibling relationships exist. No out-of-scope files were touched. The sync of both installed copies is complete.

**Issues found:**
None.

**Status:** READY_TO_SHIP
