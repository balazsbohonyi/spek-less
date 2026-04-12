# Execution Log — Include a Type column in the spek:status skill's output

<!-- Append-only. Never rewrite or delete entries. Course corrections append new entries. -->

#### 2026-04-12T00:00 — Started
Quick task. Include a Type column in the spek:status skill's output to show the type of spec: adopted, standard, quick, migrated. Executing inline.

#### 2026-04-12T00:01 — Task 1: Update table schema and reads in skills/status.md
- Added `type` to the frontmatter field list in Reads section (default `standard` when absent)
- Updated the per-file Grep instruction to also extract `type`
- Added `Type` column between `Status` and `Tasks` in the example table

Task 1 complete.

#### 2026-04-12T00:02 — Task 2: Sync to .claude/commands/spek/status.md
Copied skills/status.md to .claude/commands/spek/status.md. Global install (~/.claude/commands/spek/) does not exist — skipped.

Task 2 complete.

#### 2026-04-12T00:03 — Done
Added Type column to the spek:status all-features table. The `type` frontmatter field (adopted/standard/quick/migrated) is now extracted per-file and displayed between Status and Tasks. Absent `type` defaults to `standard`. Synced to .claude/commands/spek/status.md.
