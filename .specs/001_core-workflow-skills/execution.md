# Execution Log — Core Workflow Skills

<!--
Append-only work journal. /spek:execute writes entries here as it works.
Format: one `#### <timestamp> — <short action>` heading per meaningful action,
followed by a one-to-three line description.

This file is NEVER rewritten. Course corrections, plan revisions, and
verify-flagged fixes all append new entries rather than editing old ones.
Git history is in git; this file is the human-readable narrative.
-->

#### 2026-04-07 — Fix: plan.md undefined agent type (issue 5)

Changed "built-in Plan sub-agent" → "general-purpose sub-agent" on line 41. Two defined sub-agent types in the architecture are Explore and general-purpose only.

#### 2026-04-07 — Fix: kickoff.md silent principles-building skip (issue 4)

Updated principles-building offer to fire when `principles.md` is absent: offers to create file from template then fill it in. Previously silently skipped for fresh installs (the primary use case).

#### 2026-04-07 — Fix: new.md convention gaps (issues 1–3)

Renamed "Actions" → "Behavior", added `## Writes` section, added explicit idempotency statement to Hard rules.

#### 2026-04-07 — Started (verify-flagged fix run)

All 6 Plan tasks were pre-checked (retroactive adopt). Running to address issues flagged by `/spek:verify`. Fixing: `new.md` convention gaps (3 issues), `kickoff.md` principles-building silent skip, `plan.md` undefined agent-type reference.

