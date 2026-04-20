---
id: 029
title: improve-the-ingest-skill
status: done
part_of: SpekLess
starting_sha:
created: 2026-04-21
tags: []
---

# improve-the-ingest-skill

## Context

> Part of [**SpekLess**](../project.md).

When `spek:ingest` converts a conversation or file into a SpekLess spec, it currently "scans and summarizes" the source material. This is intentionally lossy: the one-paragraph summary shown before confirmation compresses meaning, and the subsequent spec sections receive summarized rather than faithfully-extracted content. The result is that all four content categories — context/motivation, design decisions, task details/approach, and assumptions/constraints — can be thinned or dropped entirely.

The goal of this feature is to replace the lossy scan with a structured, exhaustive extraction pass. Every piece of content in the source must be mapped into the appropriate spec section without summarizing its meaning. A user who ran `spek:ingest` on a detailed plan-mode conversation should end up with a spec that contains everything that was in the original plan — no details lost, no decisions compressed away.

**Done looks like:** running `spek:ingest` on a detailed plan-mode conversation and then asking Claude to compare the original conversation with the resulting spec produces no material omissions.

## Discussion

**Problem identified from a real workflow failure.** The user ran `spek:ingest` (no argument) against a plan-mode conversation, got a spec, then manually asked Claude to compare source vs. spec. All four content categories had material omissions: context/motivation was thin, design decisions were absent or merged into a sentence, task approach details were stripped to titles, and assumptions were not extracted at all.

**Root cause — vague "scan" instruction.** Step 1 of the no-argument path says "scan the conversation for plan/PRD content" and "output a one-paragraph summary." Both words — scan and summarize — encourage the model to compress. There is no explicit instruction to be exhaustive, and the granularity table (which controls what sections get populated) says "filled from source" without defining what "filled" means. This is enough rope to hang the whole spec.

**Alternative considered: post-hoc self-check.** Add a verification step after spec creation where the skill re-reads both source and spec and flags gaps. Rejected: it adds a step after the damage is done, it's slower, and it doesn't fix the root cause. Better to extract correctly up front.

**Chosen approach: structured exhaustive extraction.** Replace the vague "scan" with an explicit multi-bucket extraction pass that happens before any spec is proposed:
- Bucket 1 — Goal/context: every stated goal, constraint, and success criterion
- Bucket 2 — Decisions: every alternative considered and rationale given for what was chosen
- Bucket 3 — Tasks + approach: every task from the source with its full implementation detail (not just titles)
- Bucket 4 — Assumptions/constraints: every stated dependency, risk, or hard constraint

The result of this extraction is shown to the user as a structured multi-section breakdown (not a one-liner) before they confirm. This lets them see what was captured and catch anything the extraction missed.

**Faithfulness mandate.** Add an explicit principle to Step 5: extract content faithfully — do not summarize meaning, do not paraphrase decisions, do not condense task details. Verbatim or near-verbatim extraction into the relevant section is preferred over a compressed restatement. The spec should read as though the original plan author wrote it directly.

**Conversation-source nuance.** In a plan-mode conversation, valuable content is distributed across the entire thread: the user's initial framing, Claude's questions and exploration, the user's answers and constraints, and the synthesized plan. The extraction pass must cover the full conversation, not just any section explicitly labeled "plan."

## Assumptions

- [ ] Plan-mode conversations follow a structure where all four content categories (context, decisions, tasks+details, assumptions) appear somewhere in the thread, even if not in labeled sections.
- [x] The fix does not require changes to the spec template — the existing sections can hold exhaustively-extracted content.

## Plan

<!--
Written by spek-plan. Fully rewritten on re-run, EXCEPT checkbox state in ### Tasks,
which spek-execute owns.
-->

### Tasks

1. [x] Replace Step 1 summary with 4-bucket extraction display
2. [x] Add faithfulness mandate to Step 5
3. [x] Sync installed copies

### Details

#### 1. Replace Step 1 summary with 4-bucket extraction display

**Files:** `skills/ingest.md`

**Approach:** For both the file-arg and no-arg paths, replace "one-paragraph summary" with an explicit extraction pass over four buckets: (1) Goal/context — every stated goal, constraint, and success criterion; (2) Decisions — every alternative considered and rationale; (3) Tasks + approach — every task with full implementation detail, not just titles; (4) Assumptions/constraints — every dependency, risk, or hard constraint. The structured multi-section breakdown of these buckets replaces the one-liner shown to the user before confirmation. The no-arg path must cover the full conversation thread, not just sections explicitly labeled "plan." Existing AskUserQuestion gates remain unchanged.

#### 2. Add faithfulness mandate to Step 5

**Files:** `skills/ingest.md`

**Approach:** Add an explicit principle at the top of Step 5: extract content faithfully — do not summarize meaning, do not paraphrase decisions, do not condense task details; verbatim or near-verbatim is preferred over compressed restatements. Also update the granularity table: replace "Filled from source" entries with "Exhaustively extracted from source" so the intent is unambiguous to the executing model.

#### 3. Sync installed copies

**Files:** `.claude/commands/spek/ingest.md` (project-local, if exists), `~/.claude/commands/spek/ingest.md` (global, if exists), plus any Codex/OpenCode installed paths present on disk

**Approach:** Per the Sync Rule in `principles.md`, replicate the updated `skills/ingest.md` to every installed copy that exists. Check existence before writing — do not create missing directories. Apply installer render rules: replace `{{CMD_PREFIX}}` with the correct agent prefix; replace canonical `spek:<skill>` references with the configured namespace.

## Review

<!--
Written by spek:review. Fully rewritten on re-run.
This is the pre-execution design review checkpoint: findings, simpler alternatives,
missing dependencies, task ordering issues, and principle conflicts discovered after
Discussion and Plan are in place. spek:plan and spek:discuss may read this section
but only spek:review rewrites it.
-->

## Verification

**Task-by-task check:**
- Task 1 — Replace Step 1 summary with 4-bucket extraction display: ✓ — `skills/ingest.md` `## Inputs` no-arg description updated; `### Step 1` renamed "Acquire content and extract" with full 4-bucket structure; no-arg path explicitly covers full conversation thread; structured multi-section breakdown display.
- Task 2 — Add faithfulness mandate to Step 5: ✓ — Faithfulness mandate paragraph present at top of `### Step 5`; granularity table Context row updated from "Filled from source" → "Exhaustively extracted from source" in all three columns.
- Task 3 — Sync installed copies: ✓ — `.claude/commands/spek/ingest.md` matches `skills/ingest.md` with correct `{{CMD_PREFIX}}` → `/` rendering. Global `~/.claude/commands/spek/ingest.md` confirmed absent; skip is correct per Sync Rule.

**Principles check:**
- Single-agent topology: ✓ — no sub-agent spawning added.
- Section ownership: ✓ — only `## Behavior` sections modified; no section ownership boundary crossed.
- Document is the state: ✓ — no new state files.
- Append-only execution log: ✓ — execution.md is append-only per audit.
- Skill files under ~300 lines: ✓ — `skills/ingest.md` is 163 lines.
- Sync Rule: ✓ — project-local installed copy synced with render rules applied; absent global/Codex paths correctly skipped.
- `{{CMD_PREFIX}}` in user-facing references: ✓ — source skill uses `{{CMD_PREFIX}}spek:execute` etc.; installed copy renders `/spek:execute` correctly.

**Assumptions check:**
- Plan-mode conversations follow a structure where all four content categories appear somewhere in the thread: ⚠ unverifiable — behavioral assumption about model and user input; cannot be confirmed from file diff alone. <!-- unverifiable: depends on runtime model behavior and user input structure, not verifiable from code -->
- The fix does not require changes to the spec template: ✓ — `_templates/spec.md.tmpl` was not touched.

**Goal check:** The goal was to replace the lossy "scan + one-paragraph summary" with a structured exhaustive extraction pass so that no material details are lost when ingesting a plan-mode conversation. Both paths in Step 1 now run the 4-bucket extraction and display a multi-section breakdown before confirmation. The faithfulness mandate in Step 5 explicitly forbids summarizing or paraphrasing. The granularity table now says "Exhaustively extracted from source" unambiguously. The implementation directly addresses the root cause described in Context and Discussion.

**Issues found:**
None.

**Status:** READY_TO_SHIP

## Retrospective

<!--
Written by spek:retro. Fully rewritten on re-run.
This is the post-completion reflection: what changed, what surprised us, and what
should become a durable project principle. spek:retro may also propose principle
additions for user confirmation, but it owns only this section in spec.md.
-->
