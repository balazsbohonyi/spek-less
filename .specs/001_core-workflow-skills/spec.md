---
id: "001"
title: Core Workflow Skills
status: done
part_of: SpekLess
starting_sha: 8868e36
created: 2026-04-07
tags: [skills, workflow]
---

# Core Workflow Skills

## Context

> Part of [**SpekLess**](../project.md). See "Initial Feature Set" for one-line scope.

The six primary skills that constitute the full spec-first development workflow for solo developers using Claude Code. These skills are the core value of SpekLess — without them there is no framework.

**Goal:** A developer can run `/spek:kickoff` → `/spek:new` → `/spek:discuss` → `/spek:plan` → `/spek:execute` → `/spek:verify` and ship a feature with the AI staying on-target throughout, with no re-prompting of intent.

Each skill owns exactly one section of `spec.md` and rewrites it idempotently. Skills are markdown files read by Claude Code — no runtime, no binary.

**Success criteria:**
- All 6 skills are implemented, each under ~300 lines
- Each skill follows the standard frontmatter + sections convention (Inputs, Reads, Behavior/Actions, Writes, Output to user, Hard rules)
- Section ownership is strict: no skill reads or writes another skill's section
- Skills are idempotent: re-running produces correct output from current on-disk state

## Discussion

> **Retroactively adopted.** This spec was created after implementation via `/spek:kickoff` scaffolding. The design decisions behind each skill are documented in `docs/architecture.md`.

Key design decisions already made:
- **Single-agent topology** — sub-agents are context firewalls only (Explore for broad reads, general-purpose for fresh-lens verify). Never one agent per workflow step.
- **Section ownership as the core invariant** — each skill rewrites exactly one section, making manual edits a first-class intervention path.
- **No STATE.md** — the document is the state; skill idempotency makes this safe.
- **`/spek:execute` ticks checkboxes** — the one permitted cross-section write, because checkbox state reflects execution progress.

## Plan

### Tasks

- [x] 1. Implement `/spek:kickoff` — greenfield project PRD conversation, writes `project.md`
- [x] 2. Implement `/spek:new` — creates skeleton spec folder, reads config + principles + project.md
- [x] 3. Implement `/spek:discuss` — conversational Context + Discussion exploration with AskUserQuestion
- [x] 4. Implement `/spek:plan` — writes Plan section with task breakdown + per-task details
- [x] 5. Implement `/spek:execute` — executes plan task-by-task, ticks checkboxes, appends to execution.md
- [x] 6. Implement `/spek:verify` — goal-backward verification, writes Verification section

### Details

#### 1. `/spek:kickoff`
**Files:** `skills/kickoff.md`
**Approach:** Extended PRD conversation filling all sections of project.md template. Offers scaffolding and principles-building at the end. Idempotent — re-runs evolve existing project.md.

#### 2. `/spek:new`
**Files:** `skills/new.md`
**Approach:** Lightweight entry point — creates folder + skeleton spec.md from template, adds project.md back-reference if present. Non-interactive beyond title input.

#### 3. `/spek:discuss`
**Files:** `skills/discuss.md`
**Approach:** Clarification-heavy conversation. Uses AskUserQuestion for choices. Writes Context (filled) and Discussion sections. Reads principles.md to surface conflicts.

#### 4. `/spek:plan`
**Files:** `skills/plan.md`
**Approach:** Reads Context + Discussion (section-scoped). Writes Plan with numbered checkboxes and per-task Details subsections. Handles mid-execute replanning by reading execution.md tail.

#### 5. `/spek:execute`
**Files:** `skills/execute.md`
**Approach:** Reads Plan tasks, finds first unchecked, executes, ticks checkbox, appends to execution.md. Captures starting_sha on first run. Resumable.

#### 6. `/spek:verify`
**Files:** `skills/verify.md`
**Approach:** Reads Plan + execution.md + git diff since starting_sha. Goal-backward check. Writes Verification section. Offers AskUserQuestion for next move on failure.

## Verification

**Task-by-task check:**
- Task 1 — `/spek:kickoff`: ✓ — Exists, 117 lines, all required sections present. Principles-building offer now fires via AskUserQuestion when `principles.md` is absent (issue 4 fixed — creates file from template then fills it in).
- Task 2 — `/spek:new`: ✓ — Exists. "Actions" renamed to "Behavior"; `## Writes` section added; explicit idempotency statement added to Hard rules. All three convention gaps resolved (issues 1–3 fixed).
- Task 3 — `/spek:discuss`: ✓ — Exists, 74 lines. All sections present, section ownership explicit, idempotency stated, AskUserQuestion used for choices.
- Task 4 — `/spek:plan`: ✓ — Exists, 97 lines. "Built-in Plan sub-agent" corrected to "general-purpose sub-agent" (issue 5 fixed). All required sections present, mid-execute replanning handled.
- Task 5 — `/spek:execute`: ✓ — Exists, 128 lines. Finds first unchecked task, ticks checkbox, appends to execution.md, captures starting_sha on first run, resumable. All hard rules present.
- Task 6 — `/spek:verify`: ✓ — Exists, 108 lines. Goal-backward check, fresh-lens sub-agent for complex features, writes Verification section, AskUserQuestion follow-up on failure.

**Principles check:**
- Single-agent topology: ✓ — All 6 skills restrict sub-agents to Explore/general-purpose only. "Plan sub-agent" wording resolved.
- Section ownership strict: ✓ — Every skill has explicit "do not touch" language for sections it doesn't own. `/spek:execute` ticking checkboxes is named as the single exception.
- The document is the state: ✓ — No skill creates STATE.md, lockfiles, or checkpoint files.
- Append-only execution log: ✓ — execute.md Hard rules: "Append only." verify.md and plan.md both say "Do NOT touch execution.md."

**Goal check:** All six skills are implemented, cover the full workflow, and are consistent with CLAUDE.md conventions and the architecture's invariants. A developer can run kickoff → new → discuss → plan → execute → verify without re-prompting intent. The one remaining low-severity gap (`verify.md` skips `## Discussion`, which may miss out-of-scope constraints) is a minor advisory — the goal is fully achieved.

**Issues found:**
1. `skills/verify.md` — does not read `## Discussion`; may miss intentional out-of-scope constraints captured only there. (Low severity — out-of-scope items in Discussion rarely differ from what Context states explicitly.)

**Status:** READY_TO_SHIP
