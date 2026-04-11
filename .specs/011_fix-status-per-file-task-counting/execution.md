# Execution Log — Fix spek:status per-file task counting

#### 2026-04-11 — Started
Read Plan. Issue is clear from the Context: `/spek:status` shows task counts only for the
last feature. Recording starting_sha=73b2f49 in spec.md frontmatter.

#### 2026-04-11 — Task 1: diagnosed root cause in `skills/status.md`
Confirmed the `## Behavior` step 2 said "for each, count tasks" without prohibiting a
single cross-file Grep. `output_mode: count` returns an aggregate total — no per-file
breakdown available. Last feature in the list got the full count by coincidence.
Task 1 complete.

#### 2026-04-11 — Task 2: tightened `## Reads` in `skills/status.md`
Rewrote Reads item 3 to add the per-file constraint explicitly: "Each spec file must be
Grep'd individually — one Grep call per file, scoped to that file's path. Never use a
single Grep across all spec files." Kept the existing checkbox patterns (`\d+\. \[.\]`,
`\d+\. \[x\]`). Task 2 complete.

#### 2026-04-11 — Task 3: tightened `## Behavior` step 2 in `skills/status.md`
Rewrote step 2 to be fully prescriptive: "make a separate Grep call scoped to that
feature's spec.md," included concrete patterns for total and done counts, and added
explicit prohibition "Do NOT use a single bulk Grep — results will bleed across features."
Task 3 complete.

#### 2026-04-11 — Task 4: added Hard rules entry in `skills/status.md`
Appended new bullet: "Per-file Grep, never bulk. Task counts MUST come from individual
Grep calls scoped to each spec.md. A bulk Grep across all spec files will produce wrong
counts — only the last file's tasks will be attributed correctly." Task 4 complete.

#### 2026-04-11 — Task 5: synced to installed copy
Copied updated `skills/status.md` to `.claude/commands/spek/status.md`. Checked for
`~/.claude/commands/spek/` — directory does not exist, no global sync needed.
Both files verified identical. Task 5 complete. All tasks done. Ready for /spek:verify.
