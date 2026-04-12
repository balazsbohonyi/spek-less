---
name: spek:status
description: Show the status of all features at a glance — or detail for one feature. Read-only. Use when resuming work, checking progress, or deciding what to work on next. Subsumes both /spek:list and /spek:status from the deferred convenience list.
---

# /spek:status — See where things stand

You are showing the user a summary of their SpekLess features. This is the "where am I?" skill — useful when starting a fresh session, resuming after a context reset, or deciding what to work on next.

This skill is **strictly read-only**. It writes nothing, modifies nothing, spawns no sub-agents.

## Inputs

- Optional feature argument (e.g. `/spek:status 003`). If given, show detail for that feature only.
- If omitted, show all features.

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`.
2. **`.specs/principles.md`** (if exists) — full file.
3. **All `.specs/NNN_*/spec.md`** — read ONLY frontmatter and the `### Tasks` subsection. **Each spec file must be Grep'd individually** — one Grep call per file, scoped to that file's path. Never use a single Grep across all spec files; results bleed across files and the per-feature counts will be wrong. Match checkbox lines with `\d+\. \[.\]` (total) and `\d+\. \[x\]` (done). Extract `id`, `title`, `status`, `type`, and `part_of` from frontmatter. When `type` is absent, treat it as `standard`. Never read Context, Discussion, Details, or Verification.
4. **`<feature>/execution.md`** — if showing detail for one feature, read the last ~10 lines to show the most recent log entry.

## Behavior

### All-features view (no argument)

1. Scan `<specs_root>/` for directories matching `NNN_*/`.
2. For each feature directory, make a **separate Grep call scoped to that feature's `spec.md`** to count checkbox lines. Do NOT use a single bulk Grep across all spec files — results will bleed across features. Concretely: for each `<specs_root>/NNN_<slug>/spec.md`, grep that file individually for lines matching `\d+\. \[.\]` to get total, and `\d+\. \[x\]` to get done count. Extract `id`, `title`, `status`, `type`, `part_of` from that same file's frontmatter. When `type` is absent, display `standard`.
3. Resolve the "current feature" using the standard discovery order (git branch → most recently modified → none).
4. Display a table:

```
Feature status:

  ID  | Title                    | Status     | Type     | Tasks | Part of
  ----+--------------------------|------------|----------|-------|---------
> 003 | Add dark mode toggle     | executing  | quick    |  2/4  |
  002 | Token storage migration  | done       | standard |  5/5  | auth-rewrite
  001 | Auth rewrite             | verifying  | adopted  |  3/3  |

> = current feature (resolved from git branch)
```

5. Below the table, suggest a next step based on the current feature's status:
   - `discussing` → "Next: `/spek:plan` when the direction is clear."
   - `planning` → "Next: `/spek:execute` to start implementation."
   - `executing` → "Next: `/spek:execute` to continue, or `/spek:verify` if all tasks are done."
   - `verifying` → "Next: `/spek:commit` if verified clean, or `/spek:execute` to fix issues."
   - `done` → "Feature is complete. Start a new one with `/spek:new`."

### Single-feature detail (with argument)

1. Resolve the feature (explicit number or current-feature discovery).
2. Read frontmatter + task list + execution.md tail (~10 lines).
3. Display:

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

## Writes

None. This skill is strictly read-only.

## Output to user

The table or detail view described above, plus a suggested next step.

## Hard rules

- **Strictly read-only.** Never write to any file. Never modify frontmatter, checkboxes, or execution.md.
- **No sub-agents.** The reads are lightweight (frontmatter + checkbox lines); sub-agents would be wasteful.
- **Section-scoped reads.** Never read Context, Discussion, Details, or Verification sections. Frontmatter and checkbox lines are all you need.
- **No interaction.** Display the status and stop. Do not ask clarifying questions — the only ambiguity is which feature, and current-feature discovery handles that.
- **Per-file Grep, never bulk.** Task counts MUST come from individual Grep calls scoped to each `spec.md`. A bulk Grep across all spec files will produce wrong counts — only the last file's tasks will be attributed correctly.
