---
id: "009"
title: Align sub-agent type references across skills and docs
status: done
part_of: SpekLess
starting_sha: c043f6a
created: 2026-04-11
tags: []
---

# Align sub-agent type references across skills and docs

## Context

> Part of [**SpekLess**](../project.md).

SpekLess uses sub-agents as "context firewalls" — disposable isolated conversations that absorb large reads or complex passes and return only a distilled summary to the main context. Three Claude Code built-in agent types are in use:

- **Explore** — read-only (no Edit/Write tools), fast codebase mapping. Used by `/spek:plan` (threshold-based) and `/spek:adopt`.
- **Plan** — architectural analysis agent (all tools except Edit/Write/NotebookEdit). Used by `/spek:plan` for the optional self-validation/critique pass after drafting.
- **general-purpose** — full tool access, complex multi-step reasoning. Used by `/spek:verify` for the fresh-lens verification pass.

The documentation is inconsistent: some files list only Explore and general-purpose, the architecture doc's table says "Plan (built-in, optional)" but the paragraph below it contradicts that by saying "no custom agent types are defined", and the installed copy of `plan.md` was not synced after the source was updated.

**Goal:** every reference to sub-agent types across skills, docs, and principles is consistent, correct, and includes a portability note explaining that these names are Claude Code-specific.

**Success criteria:**
- `skills/plan.md` and `.claude/commands/spek/plan.md` both say "Plan sub-agent" for the critique pass.
- `docs/architecture.md` table and explanatory paragraph are consistent and include a portability note.
- `CLAUDE.md` invariant 1 and `.specs/principles.md` Architecture principle both list all three types.
- Grep for "general-purpose sub-agent" in `skills/` and `.claude/commands/spek/` returns only `verify.md` copies.

## Discussion

This issue was discovered when a user asked about adding `context: fork` / `agent: Plan` frontmatter to skill files (not a valid Claude Code mechanism — skill behavior is specified in prose, not frontmatter). Investigation revealed:

1. The architecture doc table (line 40) already listed "Plan (built-in, optional)" for `/spek:plan`'s critique pass, but the paragraph at line 44 said "No custom agent types are defined in v1.0.0" — a direct contradiction.
2. A previous spec workflow (`.specs/001_core-workflow-skills/execution.md`) had explicitly changed "Plan sub-agent" back to "general-purpose sub-agent" because the architecture doc only declared two types at that time — so it was a documentation-driven regression.
3. The principles.md and CLAUDE.md both described only two sub-agent types, propagating the gap.

**Key decisions:**
- Use **Plan** for `/spek:plan`'s optional critique pass. The Plan agent is purpose-built for architectural review — it's more semantically precise than general-purpose for this task.
- Keep **general-purpose** for `/spek:verify`'s fresh-lens pass. Verification is not architectural design — it's complex multi-step reasoning (read diffs, read spec, check against principles, make a holistic judgment). general-purpose with full tool access is the right fit.
- Keep **Explore** for codebase reads (unchanged — already correct everywhere).
- Add a portability note to `docs/architecture.md`: Explore/Plan/general-purpose are Claude Code `subagent_type` values and don't port directly to Codex CLI or OpenCode. Future porting uses the prose descriptions as the mapping guide.

## Plan

### Tasks

1. [x] Sync installed plan.md with the already-updated source
2. [x] Fix docs/architecture.md self-contradiction and add portability note
3. [x] Update CLAUDE.md invariant 1 to list all three sub-agent types
4. [x] Update .specs/principles.md Architecture principle to list all three types
5. [x] Check and sync global install if present

### Details

#### 1. Sync installed plan.md with the already-updated source

**Files:** `.claude/commands/spek/plan.md`

**Approach:** `skills/plan.md:41` was already updated to say "Plan sub-agent" in a prior edit. The installed copy at `.claude/commands/spek/plan.md:41` still says "general-purpose sub-agent". Apply the same change. Per `.specs/principles.md` Sync Rule, changes to `skills/` must be reflected in `.claude/commands/spek/`.

#### 2. Fix docs/architecture.md self-contradiction and add portability note

**Files:** `docs/architecture.md`

**Approach:** The table at lines 37–43 is correct as-is. The paragraph at line 44 currently says "No custom agent types are defined in v1.0.0. The 'verifier' behavior is a prompt pattern applied to the general-purpose sub-agent..." — this contradicts the table listing the Plan agent. Replace the paragraph with:

> SpekLess uses three Claude Code built-in agent types — no custom types are defined. `Explore` is read-only (no Edit/Write tools) and best for codebase mapping. `Plan` is the architectural analysis agent, suitable for critiquing a drafted plan. `general-purpose` has full tool access and handles complex multi-step reasoning tasks like fresh-lens verification. **Portability note:** these `subagent_type` names are Claude Code-specific. Codex CLI and OpenCode have no equivalent named types — porting SpekLess to another tool requires mapping each role to that tool's agent primitive, using the prose description in each skill as the guide.

#### 3. Update CLAUDE.md invariant 1 to list all three sub-agent types

**Files:** `CLAUDE.md`

**Approach:** Line 40 currently reads: "Sub-agents are used *only* as context firewalls for broad reads (Explore for codebase mapping, general-purpose for fresh-lens verify)." Change to: "Sub-agents are used *only* as context firewalls: Explore for broad codebase reads, Plan for optional architectural critique of a drafted plan, general-purpose for fresh-lens verify."

#### 4. Update .specs/principles.md Architecture principle to list all three types

**Files:** `.specs/principles.md`

**Approach:** Line 23 currently reads: "Sub-agents are context firewalls only: Explore for broad codebase reads, general-purpose for fresh-lens verification." Change to: "Sub-agents are context firewalls only: Explore for broad codebase reads, Plan for optional plan critique, general-purpose for fresh-lens verification."

#### 5. Check and sync global install if present

**Files:** `~/.claude/commands/spek/plan.md` (if exists)

**Approach:** Per `.specs/principles.md` Sync Rule, check whether `~/.claude/commands/spek/` exists. If it does, apply the same "Plan sub-agent" change to `plan.md` there. Use `[ -d ~/.claude/commands/spek ]` to check before acting — do not create the directory if it isn't there.

## Verification

<!--
Written by /spek:verify. Fully rewritten on re-run.
-->

**Task-by-task check:**
- Task 1 — Sync installed plan.md with source: ✓ — `.claude/commands/spek/plan.md` updated from "general-purpose sub-agent" to "Plan sub-agent" (matches `skills/plan.md`)
- Task 2 — Fix docs/architecture.md self-contradiction and add portability note: ✓ — Paragraph replaced with correct three-type summary plus portability note; table at line 40 still lists Plan (built-in, optional) and is consistent
- Task 3 — Update CLAUDE.md invariant 1: ✓ — Now lists all three types: Explore, Plan, general-purpose
- Task 4 — Update .specs/principles.md Architecture principle: ✓ — Now reads "Explore for broad codebase reads, Plan for optional plan critique, general-purpose for fresh-lens verification"
- Task 5 — Check and sync global install: ✓ — `~/.claude/commands/spek/` does not exist; correctly skipped per plan instructions

**Principles check:**
- Single-agent topology: ✓ — No new agent roles introduced; only documentation updated
- Section ownership: ✓ — Only `## Verification` written by this run
- The document is the state: ✓ — No STATE.md or checkpoint files created
- Append-only execution log: ✓ — execution.md not touched
- Sync Rule: ✓ — `skills/plan.md` and `.claude/commands/spek/plan.md` both updated; global install absent so correctly skipped

**Goal check:** The implementation achieves the stated goal. All references to sub-agent types across skills, docs, CLAUDE.md, and principles.md are now consistent and correct — all three types (Explore, Plan, general-purpose) are listed in every authoritative location. The portability note is present in `docs/architecture.md`. Success criterion #4 is confirmed: grep for "general-purpose sub-agent" in `skills/` and `.claude/commands/spek/` returns only `verify.md` entries.

**Issues found:**
None.

**Status:** READY_TO_SHIP
