# Execution Log — Documentation and Examples

<!--
Append-only work journal. /spek:execute writes entries here as it works.
Format: one `#### <timestamp> — <short action>` heading per meaningful action,
followed by a one-to-three line description.

This file is NEVER rewritten. Course corrections, plan revisions, and
verify-flagged fixes all append new entries rather than editing old ones.
Git history is in git; this file is the human-readable narrative.

Example entries:

#### 2026-04-05 14:02 — Started
Read Plan. Beginning with task 1 (middleware changes).

#### 2026-04-05 14:08 — Edited `src/auth/middleware.ts:45-82`
Replaced session token storage with HMAC cookie per task 1. Compiles clean.

#### 2026-04-05 14:12 — Ran tests
`bun test auth/` — 12 pass, 0 fail. Marking task 1 complete.

#### 2026-04-05 14:32 — Course correction
User revised Plan: use Ed25519 instead of HMAC. Task 2 reset.
Resuming from token signing with new approach.
-->

#### 2026-04-08 — Started (verify-fix run)
All 5 Plan tasks were pre-checked (retroactively adopted). Running to address
verify-flagged issue: `examples/001_toy-feature/execution.md` lacks a course-correction
entry, which the Plan explicitly required to demonstrate the append-only log mechanic.

#### 2026-04-08 — Fix: added course-correction entry to `examples/001_toy-feature/execution.md`
Inserted a realistic course-correction scenario between task 3 completion and task 4 start.
Scenario: smoke test revealed matchMedia listener was calling setTheme() but not applying
the theme class to the DOM — needed an applyTheme() call in the listener. Small in-scope
fix; no replanning required. Entry models both the discovery and the resolution pattern.

#### 2026-04-08 — Verify-fix run complete
All flagged issues addressed. Ready for /spek:verify.

