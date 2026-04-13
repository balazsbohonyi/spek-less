---
id: "018"
title: "Remove hardcoded skill counts from docs"
status: done
created: 2026-04-13
part_of: SpekLess
starting_sha: "04b79ad"
---

# Remove hardcoded skill counts from docs

> Part of [**SpekLess**](../project.md).

## Context

Every time a new skill is added to SpekLess, four documentation files require manual edits to update skill counts. These appear in multiple forms: written-out numbers ("twelve skills", "ten skills"), numeric ("12 skill files"), and count-by-category ("three groups"). The "ten skills" reference was already stale — it predated both `/spek:quick` and `/spek:ingest` and went unnoticed.

The fix is to reword every instance so no numeric skill count appears. Removing the numbers makes the docs durable: adding a future skill will not require touching these files.

Scope: `CLAUDE.md`, `README.md`, `docs/architecture.md`, `docs/maintenance.md`. `docs/architecture.md` lists skills by name in a file inventory — accurate and does not need to change.

## Discussion

_Imported from current conversation on 2026-04-13._

Decisions reached during planning:

- **Section heading:** `## The twelve skills` → `## The skills`.
- **"three groups" → "three categories":** Keep the count — the three structural categories (entry points, workflow, convenience) are a stable design constraint, unlike the total skill count.
- **"Ten skills, not thirty subagents":** Reframe as a design principle: `**Slash skills, not subagent fan-out.**` Also fixes the stale count ("ten" predates `/spek:quick` and `/spek:ingest`).
- **maintenance.md checklist:** Replace "update count accordingly" with an explicit file list — more useful and removes the implicit count-bumping instruction.

## Assumptions

- [x] `docs/architecture.md` requires no changes (lists skills by name, not by count).
- [x] The "three categories" count is stable enough to keep — entry points / workflow / convenience is a structural invariant, not an implementation detail.

## Plan

### Tasks

- [x] Task 1: CLAUDE.md — remove "Twelve" from repo purpose bullet
- [x] Task 2: CLAUDE.md — remove "12" from directory tree comment
- [x] Task 3: README.md — remove "twelve" from opening paragraph
- [x] Task 4: README.md — reframe "Ten skills, not thirty subagents" bullet
- [x] Task 5: README.md — rename section heading to `## The skills`
- [x] Task 6: README.md — change "three groups" to "three categories"
- [x] Task 7: README.md — remove "Twelve" from Status section
- [x] Task 8: docs/maintenance.md — replace "update count accordingly" with file list
- [x] Task 9: docs/maintenance.md — remove "12" from smoke test comment

### Details

**Task 1 — CLAUDE.md: repo purpose bullet**
- File: `CLAUDE.md`
- Old: `**Twelve slash skills** in \`skills/\``
- New: `**Slash skills** in \`skills/\``

**Task 2 — CLAUDE.md: directory tree comment**
- File: `CLAUDE.md`
- Old: `# the 12 skill files (copied by installer)`
- New: `# skill files (copied by installer)`

**Task 3 — README.md: opening paragraph**
- File: `README.md`
- Old: `A set of twelve workflow skills`
- New: `A set of workflow skills`

**Task 4 — README.md: "Why SpekLess exists" bullet**
- File: `README.md`
- Old: `**Ten skills, not thirty subagents.**`
- New: `**Slash skills, not subagent fan-out.**`
- Note: also fixes a stale count — "ten" predated `/spek:quick` and `/spek:ingest`.

**Task 5 — README.md: section heading**
- File: `README.md`
- Old: `## The twelve skills`
- New: `## The skills`

**Task 6 — README.md: "three groups"**
- File: `README.md`
- Old: `Skills fall into three groups.`
- New: `Skills fall into three categories.`

**Task 7 — README.md: Status section**
- File: `README.md`
- Old: `**v1.0.0** — Twelve skills, installer, templates, and two worked examples.`
- New: `**v1.0.0** — Skill set, installer, templates, and two worked examples.`

**Task 8 — docs/maintenance.md: "Adding a new skill" checklist**
- File: `docs/maintenance.md`
- Old: `Update \`README.md\` (the skills table — update count accordingly) and \`docs/architecture.md\` (add to the ownership / behavior sections).`
- New: `Update \`README.md\`, \`CLAUDE.md\`, and \`docs/architecture.md\` to reference the new skill.`

**Task 9 — docs/maintenance.md: smoke test comment**
- File: `docs/maintenance.md`
- Old: `# should contain all 12 skill files`
- New: `# should contain all skill files`

## Verification

**Task-by-task check:**
- Task 1 — CLAUDE.md repo purpose bullet: ✓ — `**Twelve slash skills**` → `**Slash skills**` confirmed in diff (CLAUDE.md:13)
- Task 2 — CLAUDE.md directory tree comment: ✓ — `# the 12 skill files` → `# skill files` confirmed in diff (CLAUDE.md:62)
- Task 3 — README.md opening paragraph: ✓ — `A set of twelve workflow skills` → `A set of workflow skills` confirmed in diff (README.md:5)
- Task 4 — README.md "Ten skills" bullet: ✓ — `**Ten skills, not thirty subagents.**` → `**Slash skills, not subagent fan-out.**` confirmed in diff (README.md:24)
- Task 5 — README.md section heading: ✓ — `## The twelve skills` → `## The skills` confirmed in diff (README.md:81)
- Task 6 — README.md "three groups": ✓ — `Skills fall into three groups.` → `Skills fall into three categories.` confirmed in diff (README.md:83)
- Task 7 — README.md Status section: ✓ — `Twelve skills, installer…` → `Skill set, installer…` confirmed in diff (README.md:327)
- Task 8 — docs/maintenance.md checklist item: ✓ — "update count accordingly" removed; CLAUDE.md added as explicit target, confirmed in diff (maintenance.md:85)
- Task 9 — docs/maintenance.md smoke test comment: ✓ — `# should contain all 12 skill files` → `# should contain all skill files` confirmed in diff (maintenance.md:131)

**Principles check:**
- Append-only execution log: ✓ — execution.md has only appended entries, no rewrites
- Section ownership: ✓ — only `## Verification` written here (plus assumption ticking, permitted exception)
- Documentation principle: ✓ — README.md and maintenance.md are the correct targets; `docs/architecture.md` was correctly left untouched (lists skills by name, not count)
- Sync rule: ✓ — no skill files or templates were modified; no sync needed

**Assumptions check:**
- `docs/architecture.md` requires no changes: ✓ confirmed — diff shows no changes to docs/architecture.md; it lists skills by name only
- "three categories" count is stable enough to keep: ✓ confirmed — the three-category structure (entry points / workflow / convenience) is a design invariant reflected consistently in the updated README

**Goal check:** The goal was to eliminate all hardcoded skill counts from documentation so that future skill additions do not require count-bumping edits. All nine instances across CLAUDE.md, README.md, and docs/maintenance.md have been removed and replaced with count-free alternatives. `docs/architecture.md` was correctly left unchanged (it lists skills by name). The "ten" stale count that predated `/spek:quick` and `/spek:ingest` has been fixed as a side-effect. The diff touches only the three files declared in scope — no regressions.

**Issues found:**
None.

**Status:** READY_TO_SHIP
