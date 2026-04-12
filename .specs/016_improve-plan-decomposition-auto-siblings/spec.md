---
id: 016
title: Improve plan.md decomposition — auto sibling creation
status: done
part_of: SpekLess
starting_sha: acf644e
created: 2026-04-12
tags: [skills, decomposition, workflow]
---

# Improve plan.md decomposition — auto sibling creation

## Context

> Part of [**SpekLess**](../project.md).

The current decomposition flow in `plan.md` has three concrete problems that make it nearly unusable in practice:

1. **Premature stop**: when task count exceeds 8, the skill stops *before* writing the Plan section — all the drafted work is discarded.
2. **Lost context**: the user is told to run `/spek:new` multiple times, but those cold runs have no knowledge of the tasks that were just planned.
3. **Ambiguous fate of the original spec**: it is never specified whether it becomes a sibling, a parent, or an orphan.

The fix: draft the full plan first (all tasks, all details), *then* offer decomposition via AskUserQuestion. At that point `plan.md` has everything it needs to create complete sibling specs automatically — correct frontmatter, derived Context/Discussion/Assumptions, and the already-detailed tasks split between them.

Sibling specs use a `<parent_id>.<N>` naming scheme (e.g., `016.1`, `016.2`), making the parent-child relationship immediately visible and keeping sibling IDs out of the sequential integer space used by `/spek:new`.

**Goal:** a feature with more than 8 tasks can be decomposed into sibling specs in a single interaction, with the full workflow (execute → verify → commit) working naturally on each sibling, and navigation skills (`/spek:status`, `/spek:resume`) showing sibling progress and routing the user to the right next step.

**Out of scope:** multi-level nesting (siblings of siblings), merge/re-aggregate flow, changing how `new.md` IDs work.

## Discussion

### Why "plan first, then offer decomposition" is the right order

The previous design asked for the decomposition decision *before* the plan was written. This was backwards: you can't propose meaningful groupings without knowing what the tasks actually are. Planning first gives you the full picture needed to cluster tasks by logical area, shared files, and dependency boundaries. It also means if the user says "keep as single plan," the monolithic plan is already ready to write — no wasted work either way.

### Why auto-creation instead of "user runs /spek:new multiple times"

When the planning context is live, `plan.md` has all the information needed to create complete sibling specs: Context (just narrowed), Discussion (subset), Assumptions (subset), and the already-detailed task groups. A user running `/spek:new` multiple times would get bare skeletons with no tasks, requiring re-planning from scratch for each sibling. The quality loss is unjustifiable when the alternative is automatic creation during the planning session.

### Sibling ID scheme: `NNN.M` vs sequential integers

Using a new sequential integer per sibling (017, 018…) is confusing: it looks like three unrelated features rather than parts of one. Using `016.1` and `016.2` signals the relationship immediately. The `[0-9][0-9][0-9]_*` glob used by `/spek:new` to compute the next integer naturally ignores `016.1_*` folders, so there's no interference between the two ID spaces.

### `part_of` semantics

`new.md` already sets `part_of:` to the project name (e.g., `SpekLess`). For siblings, `part_of:` holds the parent feature ID (e.g., `016`). These are distinguishable — project names are words, feature IDs are numeric strings. `status.md` already renders the `Part of` column from this field.

### Level 1 vs Level 2 sibling awareness in status/resume

Level 1 (passive display): `status.md` renders siblings indented under their parent. This alone is enough for users to navigate manually.

Level 2 (active routing): `resume.md` detects `status: decomposed`, scans siblings, and suggests the next executable one. When all siblings are `done`, it suggests promoting the parent to `done`. This keeps the "what do I do next?" UX working without the user needing to track sibling state themselves.

Both levels are implemented. Level 2 is the main UX improvement.

### Which skills need updating

`discuss.md` defines the canonical "Current feature discovery" pattern that all workflow skills reference. Updating it to handle `NNN.M` IDs (explicit arg glob, branch name parsing, most-recently-modified glob) automatically covers `execute.md`, `verify.md`, and `commit.md` — they all say "resolve via current-feature discovery." `resume.md` copies the pattern verbatim, so it needs its own update. `status.md` has its own all-features scan and needs an explicit second glob. `new.md` requires no change.

### Section-ownership exception

`plan.md` normally only writes to `## Plan`. On the decomposition path it also creates sibling spec files and updates the parent's `status:` frontmatter. This is a scoped exception: the alternative (user runs `/spek:new` N times) loses all planning context at exactly the moment when the context is most valuable.

## Assumptions

None.

No external bets identified — all changes are to skill files and templates within this repository. No third-party services, data contracts, or scale limits are involved.

## Plan

### Tasks

1. [x] Update `skills/plan.md` — full decomposition auto-flow
2. [x] Update `skills/discuss.md` — NNN.M support in current feature discovery
3. [x] Update `skills/resume.md` — NNN.M discovery + Level 2 sibling routing
4. [x] Update `skills/status.md` — sibling scan, grouped display, decomposed routing
5. [x] Sync all changed skills to installed copies

### Details

#### 1. Update `skills/plan.md` — full decomposition auto-flow

**Files:** `skills/plan.md`

**Approach:** Replace the current "Decomposition offer" paragraph (starts with "**Decomposition offer.**") with the new design: (a) draft the full plan first — all tasks + Details — before raising decomposition; (b) AskUserQuestion includes proposed sibling groupings (which tasks go where) and two options: "Create sibling specs" or "Keep as single plan"; (c) on decomposition chosen: glob `<specs_root>/<parent_id>.[0-9]*_*/spec.md` to determine next sibling ID, create each sibling spec file with correct frontmatter (`id: <parent_id>.<N>`, `status: planning`, `part_of: <parent_id>`), Context derived and narrowed, Discussion/Assumptions subsetted, Plan section containing only that sibling's tasks; (d) rewrite parent's `## Plan` to a sibling index and set parent frontmatter `status: decomposed`. Update the Writes section to document the decomposition-path exception (creates new spec files + updates parent frontmatter). Add a Hard rule clarifying this is the only case where `plan.md` writes outside `## Plan`.

#### 2. Update `skills/discuss.md` — NNN.M support in current feature discovery

**Files:** `skills/discuss.md`

**Approach:** In the "Current feature discovery" section, update three items: (1) explicit argument — note that the argument may be `NNN` or `NNN.M`; the glob just uses the supplied ID as the folder prefix (`.specs/<id>_*/`), no special-casing needed; (2) git branch parsing — extend the example pattern from `feat/NNN-*` to also cover `feat/NNN.M-*` (e.g., `feat/016.1-auth-sessions`); (3) most recently modified — change glob from `.specs/NNN_*/` to also include `.specs/NNN.M_*/`. These three changes cover `execute.md`, `verify.md`, and `commit.md` for free since they defer to this definition.

#### 3. Update `skills/resume.md` — NNN.M discovery + Level 2 sibling routing

**Files:** `skills/resume.md`

**Approach:** Three changes. (1) "Current feature discovery" section — same three updates as `discuss.md`: explicit arg handles `NNN.M`, branch parsing handles dots, most-recently-modified glob includes `NNN.M_*`. (2) Reads step 3 — change "All `.specs/NNN_*/spec.md`" to also include `NNN.M_*/spec.md`. (3) Level 2 behavior — add a new paragraph after step 4: when resolved feature has `status: decomposed`, glob `<specs_root>/<parent_id>.[0-9]*_*/spec.md`, read frontmatter + checkboxes for each sibling, display them in order with task progress and a `← next` marker on the first non-done sibling, suggest `/spek:execute <next_sibling_id>`. When all siblings are `done`, suggest updating parent to `done`. Add `decomposed` row to the next-step table pointing to this new behavior.

#### 4. Update `skills/status.md` — sibling scan, grouped display, decomposed routing

**Files:** `skills/status.md`

**Approach:** Three changes. (1) Reads — add a second glob for `NNN.M_*/spec.md` to pick up sibling specs alongside the existing `NNN_*/spec.md` glob. (2) All-features display — after collecting all specs (parents + siblings), group siblings under their parent using `part_of:`: render the parent row first, then siblings immediately after indented with the `↳` prefix, ordered by `.N` suffix. Example:
```
  016   | Big Feature      | decomposed | —    |
  016.1 | Auth sessions    | done       | 4/4  |
  016.2 | Token refresh    | planning   | 0/3  |
```
(3) Next-step suggestion — add `decomposed` → "Feature decomposed. Run `/spek:resume <id>` to see sibling progress and get routed to the next step."

#### 5. Sync all changed skills to installed copies

**Files:** `.claude/commands/spek/plan.md`, `.claude/commands/spek/discuss.md`, `.claude/commands/spek/resume.md`, `.claude/commands/spek/status.md`, `~/.claude/commands/spek/*.md` (if directory exists)

**Approach:** For each of the four changed skills, copy `skills/<skill>.md` to `.claude/commands/spek/<skill>.md`. Then check whether `~/.claude/commands/spek/` exists; if so, copy all four there as well. This is mandatory per the Sync Rule in `principles.md` — a change to a skill file that isn't reflected in the installed copies means the running skills and source diverge.

## Verification

<!--
Written by /spek:verify. Fully rewritten on re-run.
-->

**Task-by-task check:**
- Task 1 — Update `skills/plan.md` — full decomposition auto-flow: ✓ — `skills/plan.md:35-63` has full decomposition logic: draft first, AskUserQuestion with groupings, glob siblings, create spec files, sibling index, `status: decomposed`; Writes and Hard rules updated with exception clauses.
- Task 2 — Update `skills/discuss.md` — NNN.M support in current feature discovery: ✓ — `skills/discuss.md:24-27`: explicit arg note (`016.1`), branch pattern (`feat/NNN.M-*`), most-recently-modified glob includes `NNN.M_*/`.
- Task 3 — Update `skills/resume.md` — NNN.M discovery + Level 2 sibling routing: ✓ — `skills/resume.md:20,27-30` updates Reads + discovery; `skills/resume.md:55-77` adds `decomposed` table row and full sibling routing block with `← next` marker and all-done suggestion.
- Task 4 — Update `skills/status.md` — sibling scan, grouped display, decomposed routing: ✓ — `skills/status.md:21,28` updates Reads and scan step; `skills/status.md:31-47` grouped table with `↳` prefix and `—` Tasks for decomposed parent; `skills/status.md:54` adds `decomposed` next-step suggestion.
- Task 5 — Sync all changed skills to installed copies: ✓ — `diff skills/{plan,discuss,resume,status,commit}.md .claude/commands/spek/{plan,discuss,resume,status,commit}.md` all clean; global `~/.claude/commands/spek/` absent, correctly skipped.

**Principles check:**
- Skill files follow standard sections: ✓ — all five changed skills retain Inputs → Reads → Behavior → Writes → Output to user → Hard rules ordering.
- Skill files stay under ~300 lines: ✓ — plan.md 123, discuss.md 93, resume.md 94, status.md 92, commit.md 213.
- Single-agent topology: ✓ — no new sub-agent roles introduced.
- Section ownership: ✓ — decomposition-path exception correctly documented in plan.md Writes and Hard rules.
- Sync Rule: ✓ — all five skills synced to `.claude/commands/spek/`; global install check performed and correctly skipped.
- No linter/formatter, no HTML comment abuse: ✓

**Assumptions check:** *(section present but has no checkbox entries — "None." written)*

**Goal check:** The implementation achieves the stated goal. `plan.md` drafts the full plan before offering decomposition, creates complete sibling spec files (correct frontmatter, narrowed Context, subset Discussion/Assumptions, task-split Plan), rewrites the parent Plan to a sibling index, and sets `status: decomposed`. Navigation skills (`status.md`, `resume.md`) show sibling progress and route to the next step. The previously flagged gap — `commit.md`'s inline discovery not covering `NNN.M_*/` — was fixed: `skills/commit.md:32` now reads "most-recently-modified `.specs/NNN_*/` or `.specs/NNN.M_*/`" and the branch pattern includes `feat/NNN.M-*`. The full workflow (execute → verify → commit) works naturally on each sibling.

**Issues found:**
None.

**Status:** READY_TO_SHIP
