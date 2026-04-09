---
id: "008"
title: principles suggestion
status: done
part_of: SpekLess
starting_sha: 3bab255
created: 2026-04-09
tags: []
---

# principles suggestion

## Context

> Part of [**SpekLess**](../project.md).

`principles.md` currently grows in only two ways: during `/spek:kickoff` (which seeds it from a template) and via manual user edits. In practice, the most valuable principles are discovered mid-feature — "we realized we always want X" surfaces during a discussion, not at project kickoff. Without a capture path, those insights evaporate unless the user remembers to manually update `principles.md` later.

**Goal:** extend `/spek:discuss` so that when the conversation surfaces a decision that applies project-wide, the skill notices the signal, drafts a concrete testable principle for each candidate, presents them all at once via `AskUserQuestion`, and appends confirmed ones to the relevant section of `principles.md`. The constitution becomes a living document rather than a one-time kickoff artifact.

**Success criteria:** after a discussion where a project-wide decision is made, the developer can accept or reject suggested principles inline and they land in `principles.md` — no manual editing required.

**Out of scope:** detection in other skills (`/spek:plan`, `/spek:execute`, `/spek:verify`); auto-appending without user confirmation; creating `principles.md` if it doesn't exist.

## Discussion

<!--
The exploration phase: alternatives considered, key decisions made, ambiguities resolved.
This is the record of *how* we decided what we decided.
Written by /spek:discuss. Fully rewritten on re-run.
-->

### Alternatives considered

**Where to put detection — other skills?**
`/spek:verify` could surface principles after the fact ("this fix should probably be a principle"). Too late — the insight is freshest during the conversation that surfaced it. `/spek:plan` is similarly downstream. `/spek:discuss` is the natural home because it's where decisions are being negotiated in real time.

**Detection heuristic — mechanical or conversational?**
A mechanical heuristic (e.g. any decision touching a file outside the current feature scope) would produce false positives and miss the semantically important ones. Claude notices the signal conversationally — language like "we always want X", "never do Y", "this is a hard rule", or any constraint that clearly transcends the feature at hand.

**How many principles to surface — one, all, or the strongest?**
Asking about each candidate separately creates interruption friction. Auto-selecting only the strongest one risks missing real candidates. Batch: present all candidates at the end of the discussion in one `AskUserQuestion`, user accepts or rejects each.

### Decisions made

- **Trigger:** end of `/spek:discuss`, after the conversation wraps and after writing Context + Discussion to spec.md. Only fires if at least one project-wide signal was noticed.
- **Detection:** Claude judges conversationally during the discussion. No mechanical keyword matching — the signal is semantic.
- **Drafting:** Claude drafts each candidate principle in concrete, testable form (matching the style of existing entries in `principles.md`). The user sees the draft and approves or rejects.
- **Placement:** Claude picks the most relevant existing section in `principles.md` (Code Style, Architecture, Testing, Documentation, Security, or other). If no section clearly fits, append to the end under a new section header.
- **Missing `principles.md`:** skip silently — no file creation. The skill is not responsible for bootstrapping `principles.md`.
- **Batching:** one `AskUserQuestion` listing all candidates with checkboxes or numbered options. User confirms which to add.

### Ambiguities resolved

- **Does this touch `/spek:discuss`'s Writes contract?** Yes — `principles.md` is a new write target for the skill. It doesn't violate section-ownership (that rule governs `spec.md` sections). The append is conditional on user confirmation, so it satisfies the "no forced side effects" spirit.
- **Can the user edit the drafted principle before accepting?** The AskUserQuestion will include the drafted text; the user can type a revised version in their reply. The skill should use whatever text the user provides if they supply an edited version.

### Open questions

None — scope is clear enough to plan.

## Plan

<!--
Written by /spek:plan. Fully rewritten on re-run, EXCEPT checkbox state in ### Tasks,
which /spek:execute owns.
-->

### Tasks

1. [x] Add principles detection + AskUserQuestion flow to Behavior section
2. [x] Add `principles.md` as conditional write target in Writes section
3. [x] Update Hard rules and Output to user to reflect the new write target

### Details

#### 1. Add principles detection + AskUserQuestion flow to Behavior section

**Files:** `skills/discuss.md`

**Approach:** After the existing Behavior prose (the "Be a clarification engine" block), add a new paragraph describing the detection signal (language like "we always want X", "never do Y", "this is a hard rule", or any constraint that clearly transcends the current feature). Then add a new numbered step — triggered at the end of the discussion, after Context + Discussion are written — that collects all noticed candidates and presents them in a single `AskUserQuestion` with drafted principle text. Each candidate should be drafted in concrete, testable form matching the style of existing entries in `principles.md`. If no candidates were noticed, skip silently. If `principles.md` doesn't exist, skip silently.

#### 2. Add `principles.md` as conditional write target in Writes section

**Files:** `skills/discuss.md`

**Approach:** Add a step 4 to the numbered Writes list. It should describe: check if `principles.md` exists — if not, skip. If AskUserQuestion in step (Behavior) was triggered and user confirmed any candidates, append each confirmed principle to the most relevant section in `principles.md` (Code Style, Architecture, Testing, Documentation, Security, or a new section if none fit). Use the exact text the user provides if they edited a candidate, otherwise use the drafted text. This step fires only after steps 1–3 (Context + Discussion + status update) are complete.

#### 3. Update Hard rules and Output to user to reflect the new write target

**Files:** `skills/discuss.md`

**Approach:** Add a Hard rule stating the conditions under which `principles.md` may be written: only after user confirmation via `AskUserQuestion`, only if the file already exists, and only by appending — never rewriting or restructuring existing content. In Output to user, add a note: if principles were appended, mention how many and to which section. No other changes to Hard rules or Output.

## Verification

**Task-by-task check:**
- Task 1 — Add principles detection + AskUserQuestion flow to Behavior section: ✓ — `skills/discuss.md:46-54`: detection paragraph with signals, end-of-discussion trigger with numbered draft/AskUserQuestion/append steps, silent-skip rules for both missing candidates and missing file
- Task 2 — Add `principles.md` as conditional write target in Writes section: ✓ — `skills/discuss.md:71`: step 4 added with all three conditions (file exists, candidate noticed, user confirmed), placement logic, user-edit-wins rule, and no-restructure constraint
- Task 3 — Update Hard rules and Output to user: ✓ — `skills/discuss.md:88`: Hard rule added listing all write conditions; `skills/discuss.md:77`: Output to user bullet added for principles appended count + section

**Principles check:**
- Skill files follow standard sections convention (Inputs → Reads → Behavior → Writes → Output → Hard rules): ✓ — section order preserved
- Skill files stay under ~300 lines: ✓ — 88 lines
- Section ownership is strict: ✓ — only `skills/discuss.md` modified; no other skill or spec section touched
- Single-agent topology: ✓ — no new sub-agent roles introduced
- The document is the state: ✓ — no new state files created

**Goal check:** The Context goal was to extend `/spek:discuss` so that project-wide decisions surfaced during a discussion are captured, drafted as concrete testable principles, presented in a single `AskUserQuestion`, and appended to the relevant section of `principles.md` on confirmation. All four elements are present in the diff. The three out-of-scope items (creating `principles.md` if absent, auto-appending without confirmation, detection in other skills) are each explicitly handled by the silent-skip rules and conditional guards.

**Issues found:** None.

**Status:** READY_TO_SHIP
