---
name: spek:status
description: Show the status of all features at a glance — or detail for one feature. Read-only. Use when resuming work, checking progress, or deciding what to work on next. Subsumes both spek:list and spek:status from the deferred convenience list.
---

# spek:status — See where things stand

You are showing the user a summary of their SpekLess features. This is the "where am I?" skill — useful when starting a fresh session, resuming after a context reset, or deciding what to work on next.

This skill is **strictly read-only**. It writes nothing, modifies nothing, spawns no sub-agents.

## Inputs

- Optional feature argument (e.g. `spek:status 003`). If given, show detail for that feature only.
- If omitted, show all features.

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`.
2. **`.specs/principles.md`** (if exists) — full file.
3. **All `.specs/NNN_*/spec.md` and `.specs/NNN.M_*/spec.md`** — read ONLY frontmatter and task checkbox lines (from `### Tasks` for standard specs; `### Investigation` / `### Fix` for bug specs — the Grep pattern catches all groups). Use **two bulk Greps** across all spec files: one matching `^\d+\. \[.\]` (total checkboxes, line-anchored) and one matching `^\d+\. \[x\]` (done checkboxes, line-anchored). The `^` anchor prevents false positives from numbered-checkbox patterns appearing mid-line in prose or code spans. Both Greps return `filename:line` pairs — group results by file path to compute per-feature counts. Extract `id`, `title`, `status`, `type`, `confidence`, and `part_of` from frontmatter. When `type` is absent, treat it as `standard`. When `confidence` is absent, treat it as not applicable. Never read Context, Discussion, Details, or Verification.
4. **`<feature>/execution.md`** — if showing detail for one feature, read the last ~10 lines to show the most recent log entry.

## Behavior

### All-features view (no argument)

1. Scan `<specs_root>/` for directories matching `NNN_*/` and `NNN.M_*/`.
2. Gather checkbox counts with exactly **two bulk Greps** across `<specs_root>/`:
   - Grep 1: pattern `^\d+\. \[.\]` — all checkbox lines (total), line-anchored to avoid false positives in prose. Results come back as `path/to/NNN_foo/spec.md:line`. Group by file path.
   - Grep 2: pattern `^\d+\. \[x\]` — done checkbox lines only, line-anchored. Group by file path.
   Per-feature task count = (lines from Grep 1 for that file) / (lines from Grep 2 for that file).
   Read each `spec.md`'s frontmatter to extract `id`, `title`, `status`, `type`, `confidence`, `part_of`. When `type` is absent, display `standard`.
3. Resolve the "current feature" using the standard discovery order (git branch → most recently modified → none).
4. Display a table. **Group siblings under their parent:** after collecting all specs, sort parent specs in **descending** numeric order (those without a `.` in the `id`, highest `NNN` first), then for each parent that has siblings (specs where `part_of` equals the parent's `id`), render the sibling rows immediately after the parent, indented with `↳`.

   **Sibling detection — conditional "Part of" column:** after loading all specs, check whether any spec's `part_of` value matches the `id` of another spec in the collection. If **at least one** such relationship exists, include the "Part of" column for all rows (sibling rows show their `part_of` value; non-sibling rows show `—`). If **no** sibling relationships exist, omit the "Part of" column entirely from the header and every data row.

   **Confidence column:** always include this column. For rows where `type: bug`, show the `confidence` value (e.g. `unknown`, `low`, `medium`, `high`). For all other rows show `—`.

When siblings exist:

| ID | Title | Status | Type | Confidence | Tasks | Part of |
| --- | --- | --- | --- | --- | --- | --- |
| >016 | Big Feature | decomposed | standard | — | — | |
| ↳016.1 | Auth sessions | done | standard | — | 4/4 | 016 |
| ↳016.2 | Token refresh | planning | standard | — | 0/3 | 016 |
| 003 | Add dark mode toggle | executing | quick | — | 2/4 | — |
| 007 | Login fails on Safari | executing | bug | medium | 1/3 | — |
| 001 | Auth rewrite | verifying | adopted | — | 3/3 | — |

When no siblings exist (omit "Part of" column):

| ID | Title | Status | Type | Confidence | Tasks |
| --- | --- | --- | --- | --- | --- |
| >003 | Add dark mode toggle | executing | quick | — | 2/4 |
| 007 | Login fails on Safari | executing | bug | medium | 1/3 |
| 001 | Auth rewrite | verifying | adopted | — | 3/3 |

> = current feature (resolved from git branch)

Order siblings by their `.N` suffix in **ascending** order (016.1 before 016.2). Parent rows with `status: decomposed` show `—` in the Tasks column (the work is in the siblings).

5. Below the table, suggest a next step based on the current feature's status:
   - `discussing` → "Next: `/spek:plan` when the direction is clear."
   - `planning` → "Next: `/spek:execute` to start implementation."
   - `executing` → "Next: `/spek:execute` to continue, or `/spek:verify` if all tasks are done."
   - `verifying` → "Next: `/spek:commit` if verified clean, or `/spek:execute` to fix issues."
   - `decomposed` → "Feature decomposed. Run `/spek:resume <id>` to see sibling progress and get routed to the next step."
   - `done` → "Feature is complete. Start a new one with `/spek:new`."

### Single-feature detail (with argument)

1. Resolve the feature (explicit number or current-feature discovery).
2. Read frontmatter + task list + execution.md tail (~10 lines).
3. Display:

For a standard spec:

```
003: Add dark mode toggle
Status: executing
Tasks:
  1. [x] Create theme state module
  2. [x] Build ThemeSelect component
  3. [ ] Apply theme on app mount
  4. [ ] Write integration tests

Last log entry:
  ## 2026-04-05 09:22 — Task 2 complete

Next: /spek:execute to continue from task 3.
```

For a bug spec (`type: bug`), add `Confidence:` immediately after `Status:`:

```
007: Login fails on Safari
Status: executing
Confidence: medium
Investigation:
  1. [x] Reproduce with minimal page
  2. [ ] Bisect to failing commit
Fix:
  3. [ ] Apply fix and add regression test

Last log entry:
  ## 2026-04-05 11:14 — Task 1 complete

Next: /spek:execute to continue from task 2.
```

## Writes

None. This skill is strictly read-only.

## Output to user

The table or detail view described above, plus a suggested next step.

## Hard rules

- **Strictly read-only.** Never write to any file. Never modify frontmatter, checkboxes, or execution.md.
- **No sub-agents.** The reads are lightweight (frontmatter + checkbox lines); sub-agents would be wasteful.
- **Section-scoped reads.** Never read Context, Discussion, Details, or Verification sections. Frontmatter and checkbox lines are all you need.
- **No interaction.** Display the status and stop. Do not ask clarifying questions — the only ambiguity is which feature, and current-feature discovery handles that.
- **Two bulk Greps, never per-file.** Use exactly two Greps across all spec files (one for `^\d+\. \[.\]`, one for `^\d+\. \[x\]`), both line-anchored with `^` to avoid false positives from checkbox-like patterns in prose or code spans. Group results by file path. Per-file Greps are correct but slow — they scale as 2N tool calls and should not be used.
