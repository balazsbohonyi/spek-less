---
id: "002"
title: Convenience Skills
status: done
part_of: SpekLess
starting_sha: aeeb49f
created: 2026-04-07
tags: [skills, ux]
---

# Convenience Skills

## Context

> Part of [**SpekLess**](../project.md). See "Initial Feature Set" for one-line scope.

The four supporting skills that round out the developer experience beyond the core workflow. These skills handle retroactive adoption, session resumption, status inspection, and commit drafting — the situations a solo dev hits every day when working with an AI agent over time.

**Goal:** A developer never loses context when pausing, resuming, checking status, or creating a commit. The framework handles all four gracefully without new cognitive overhead.

**Success criteria:**
- `/spek:adopt` produces a usable spec from existing code without running the full workflow
- `/spek:resume` orients the developer instantly after a break or context reset
- `/spek:status` gives a one-glance view of all features and their progress
- `/spek:commit` drafts a spec-anchored commit and never commits without explicit confirmation

## Discussion

> **Retroactively adopted.** Design rationale in `docs/architecture.md`.

Key decisions:
- **`/spek:adopt` pre-checks tasks** — work predating SpekLess is marked done in Plan; no execution.md is created (there's no log of work done before adoption)
- **`/spek:resume` is read-only** — it only orients and suggests next command; it never writes
- **`/spek:status` is read-only** — frontmatter scanning only; never modifies state
- **`/spek:commit` requires explicit AskUserQuestion confirmation** — never auto-commits, never `--amend`, never `--no-verify`

## Plan

### Tasks

- [x] 1. Implement `/spek:adopt` — retroactive spec creation for existing code, infers Context + Plan from files
- [x] 2. Implement `/spek:resume` — session re-orientation from spec + execution.md tail, suggests next command
- [x] 3. Implement `/spek:status` — reads all spec.md frontmatter, renders feature list with status indicators
- [x] 4. Implement `/spek:commit` — reads spec + execution.md tail + git diff, drafts commit, confirms via AskUserQuestion

### Details

#### 1. `/spek:adopt`
**Files:** `skills/adopt.md`
**Approach:** Reads existing code (may delegate to Explore subagent for large codebases). Infers Context from what exists. Generates Plan with all tasks pre-checked. Sets `status: done`. Does not create execution.md.

#### 2. `/spek:resume`
**Files:** `skills/resume.md`
**Approach:** Reads spec.md (Context + Plan checkbox state) and last ~20 lines of execution.md if present. Shows current feature status and last logged action. Suggests specific next command. Strictly read-only.

#### 3. `/spek:status`
**Files:** `skills/status.md`
**Approach:** Globs all `spec.md` files. Reads frontmatter (id, title, status) via Grep. Renders a table or list. Accepts optional feature number argument for detailed view of one feature.

#### 4. `/spek:commit`
**Files:** `skills/commit.md`
**Approach:** Reads spec.md (for feature title/goal), execution.md tail (for recent work summary), and `git diff`. Drafts a spec-anchored commit message per `commit_style` config. Presents via AskUserQuestion. Runs `git commit` only on confirmation.

## Verification

**Task-by-task check:**
- Task 1 — `/spek:adopt`: ✓ — `skills/adopt.md` exists; infers Context from code, pre-checks all tasks, sets `status: done`, skips execution.md creation, delegates to Explore for broad scope. `## Writes` section now present (`adopt.md:56`), explicitly stating no execution.md is created. Sections convention satisfied.
- Task 2 — `/spek:resume`: ✓ — `skills/resume.md` exists; read-only, shows task progress + execution log tail, suggests next command. `principles.md` now listed as item 2 in Reads (`resume.md:18`). Execution log tail corrected to ~20 lines (`resume.md:22`). Both prior issues resolved.
- Task 3 — `/spek:status`: ✓ — `skills/status.md` exists; reads frontmatter + checkboxes via Grep, renders table + single-feature detail view, strictly read-only. `principles.md` now listed as `(if exists) — full file.` (`status.md:19`). Invariant 7 satisfied.
- Task 4 — `/spek:commit`: ✓ — `skills/commit.md` exists; reads spec title + execution log tail + git diff; drafts spec-anchored message per `commit_style`; confirms via AskUserQuestion; never `--amend`, never `--no-verify`, never auto-stages silently. All promises met. Unchanged.

**Principles check:**
- Skill files follow standard sections convention: ✓ — all four skills now have Inputs, Reads, Behavior/Actions, Writes, Output to user, Hard rules in order.
- Skill files stay under ~300 lines: ✓ — longest is `commit.md` at 225 lines.
- Single-agent topology: ✓ — `adopt.md` delegates to Explore for breadth reads. `resume.md`, `status.md`, `commit.md` explicitly forbid sub-agents.
- Append-only execution log: ✓ — `commit.md` appends exactly one `Committed` entry. Others don't write.
- Section-scoped reads: ✓ — all four skills read only the sections they need, with explicit Hard rules forbidding bulk reads.
- Principles-aware (invariant 7): ✓ — all four skills now list `principles.md` in their Reads section.
- No secrets: ✓ — no secrets in any skill file.

**Goal check:** The four skills collectively achieve the stated goal. A developer can adopt existing code (`/spek:adopt`), check progress across features (`/spek:status`), re-orient after a break (`/spek:resume`), and create spec-anchored commits without automation risk (`/spek:commit`). All four Success Criteria are met. All invariant gaps identified in the prior verify pass have been resolved in the working tree.

**Issues found:** None.

**Status:** READY_TO_SHIP
