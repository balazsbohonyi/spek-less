# Execution Log — Add --claude / --codex / --opencode target flags to install.js

<!--
Append-only work journal. spek:execute writes entries here as it works.
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

#### 2026-04-22 — Started
Read Plan and install.js. Beginning with task 1: parse --claude / --codex / --opencode flags in main().

#### 2026-04-22 — Task 1: Parse target flags in main()
Extended args parsing in main(): added known-flag validation (unrecognized --flags print usage and exit 1),
added targetAgent derivation ('claude_code', 'codex', 'opencode', or null). Updated JSDoc usage comment
to document the three new flags alongside --defaults.

#### 2026-04-22 — Task 1 complete

#### 2026-04-22 — Task 2: Add buildFlagConfig()
Added synchronous buildFlagConfig(targetAgent, cwd) that reads config.yaml and returns a config object
with installScope:'3', createPrinciples:false, flagMode:true. collectConfig() now sets flagMode:false.

#### 2026-04-22 — Task 2 complete

#### 2026-04-22 — Task 3: Route flag mode through main()
Added early-return branch in main(): when targetAgent !== null, print one-line sync banner, call
buildFlagConfig, and pass config to runInstall. Skips welcome card, git check, and summary card.
Also suppressed the card(4,5) inside runInstall when flagMode is true.

#### 2026-04-22 — Task 3 complete

#### 2026-04-22 — Task 4: Guard runInstall() against missing agent roots
Added agentRootExists(agent, rootDir) helper inside runInstall that checks for .claude / .codex / .opencode
top-level dir. Both installSkillsTo call sites now check agentRootExists in flag mode and print a skip
message instead of creating directories.

#### 2026-04-22 — Task 4 complete

#### 2026-04-22 — Task 5: Update principles.md Sync Rule
Replaced vague "Running node install.js handles these sync cases" with the explicit three-command recipe
(--claude / --codex / --opencode) plus a note that each is a no-op for absent roots.

#### 2026-04-22 — Task 5 complete

#### 2026-04-22 — Task 6: Update docs/maintenance.md, README.md; check architecture.md
Updated smoke test step 2 in maintenance.md to show the three-command sync recipe.
Added a new paragraph to README.md Install section documenting --claude/--codex/--opencode flags
and when to use them vs. the interactive flow.
docs/architecture.md only references install.js in the directory tree — no flag docs needed there.

#### 2026-04-22 — Task 6 complete

#### 2026-04-22 — All tasks complete
All 6 tasks finished. Status advanced to verifying.
