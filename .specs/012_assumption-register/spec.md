---
id: "012"
title: assumption register
status: done
part_of: SpekLess
starting_sha: f2a0343
created: 2026-04-12
tags: []
---

# assumption register

## Context

> Part of [**SpekLess**](../project.md).

Solo developers make assumptions constantly — about APIs, data formats, scale, external service behavior — because there is no one to sanity-check them. Every other spec framework captures *decisions* (what was chosen and why) but not *assumptions* (what was taken as given). These are different failure modes: a wrong decision is a design flaw you can reason about; a wrong assumption is a hidden dependency that silently invalidates everything built on top of it.

This feature adds a structured `## Assumptions` section to `spec.md`. `/spek:discuss` owns the section and writes it as a checklist of things taken as given before building. `/spek:verify` ticks each checkbox when it can confirm the assumption held in the implementation, and flags any it cannot confirm with an explicit note.

**Done looks like:** `spec.md.tmpl` has the new section in the right position, `/spek:discuss` prompts for assumptions at the end of its conversation, and `/spek:verify` includes an assumption-verification pass. No new files. No architecture change.

## Discussion

### Alternatives considered

**Where to place `## Assumptions` in `spec.md`:** Three positions were on the table — (A) after Context before Discussion, (B) after Discussion before Plan, (C) as a sub-section inside Context. Option A treats assumptions as inputs to discussion; option C folds them into the constraint statement. Both collapse the distinction between what is *given* and what is *decided*. Option B was chosen: assumptions crystallize at the end of the discuss conversation, immediately before planning commits to an approach. Positioning them there makes the sequencing visible in the document.

**Who ticks the checkboxes:** Verify ticking boxes in a section owned by discuss is a second instance of the plan/execute checkbox pattern. The alternative — having discuss leave checkboxes unticked and verify append a separate sub-section — would mean two skills writing to the same section, which is worse. The checkbox model is the right narrow exception, and principles.md was updated to reflect it explicitly.

### Decisions made

- Section placement: after `## Discussion`, before `## Plan`.
- Section ownership: `/spek:discuss` writes the section. `/spek:verify` ticks checkboxes only — it does not rewrite the section.
- Unverifiable assumptions: verify flags them with an explicit note (*"could not be confirmed: no X found in diff"*) rather than leaving the checkbox unticked silently.
- Scope: template change + discuss.md behavior + verify.md pass. No new files, no installer change.

### Ambiguities resolved

- *Does discuss always prompt for assumptions?* Yes — at the end of the discuss conversation, as a natural closing step ("anything taken as given that we should write down?"). It is lightweight, not a formal gate.
- *What counts as an assumption worth writing?* External service behavior, data format contracts, scale constraints, third-party availability — anything the implementation will depend on that isn't controlled by this codebase.

### Open questions

None.

## Plan

### Tasks

1. [x] Add `## Assumptions` section to `spec.md.tmpl`
2. [x] Add assumption-prompting step to `discuss.md`
3. [x] Add assumption-verification pass to `verify.md`
4. [x] Update examples to include the new section
5. [x] Sync changed files to installed copies
6. [x] Update `docs/architecture.md` for the new section and exception
7. [x] Fix `verify.md` — item 7 wording and Reads "if present" qualifier
8. [x] Fix example 001 Verification to match canonical format
9. [x] Fix `verify.md` — two Writes guards for missing `## Assumptions` section
10. [x] Fix `discuss.md` — update frontmatter description field

### Details

#### 1. Add `## Assumptions` section to `spec.md.tmpl`

**Files:** `_templates/spec.md.tmpl`

**Approach:** Insert the new section between `## Discussion` and `## Plan`. Include an HTML comment (matching the style of other sections) that explains: written by `/spek:discuss`, checkboxes ticked by `/spek:verify`. Add one placeholder line `- [ ] <assumption>` so the structure is visible in the skeleton — the comment and placeholder are removed when discuss writes real content.

#### 2. Add assumption-prompting step to `discuss.md`

**Files:** `skills/discuss.md`

**Approach:** Two additions. In Behavior: at the natural close of discussion (after all questions are resolved, before writing), add a lightweight prompt — "Any assumptions worth writing down before you build? Think: external service behavior, data contracts, scale limits, third-party availability." This is conversational, not a formal gate; if the user has none, the section is written empty. In Writes: add a step to write `## Assumptions` as a checklist (one `- [ ]` line per assumption; if none, write the section with only the HTML comment). Update the Reads list to declare discuss owns `## Assumptions`. Hard rules: update "Section-scoped writes" to include `## Assumptions`.

#### 3. Add assumption-verification pass to `verify.md`

**Files:** `skills/verify.md`

**Approach:** Three additions. In Reads: add `## Assumptions` to what's read from spec.md (Grep for header + offset Read). In "What to check": add item — for each assumption checkbox, check whether the diff confirms the assumption held; flag with explicit note if unverifiable. In Writes: add an Assumptions check block to the Verification structure template, and add the checkbox-ticking write — `[x]` for confirmed, leave `[ ]` and append `<!-- unverifiable: <reason> -->` inline for those that can't be confirmed. In Hard rules: update "Section-scoped writes" to note the Assumptions checkbox-ticking exception per `principles.md`.

#### 4. Update examples to include the new section

**Files:** `examples/001_toy-feature/spec.md`, `examples/002_adopted-feature/spec.md`

**Approach:** Insert `## Assumptions` in the correct position (after `## Discussion`, before `## Plan`) in both files. For `001_toy-feature`: show 2-3 plausible assumptions with `[x]` ticked. For `002_adopted-feature`: show the section with the HTML comment only and no entries.

#### 5. Sync changed files to installed copies

**Files:** `.specs/_templates/spec.md.tmpl`, `.claude/commands/spek/discuss.md`, `.claude/commands/spek/verify.md`

**Approach:** Copy source files to installed locations. No global install present.

#### 6. Update `docs/architecture.md` for the new section and exception

**Files:** `docs/architecture.md`

**Approach:** Three targeted edits. (1) Invariant #2 (line ~12): update "The one exception is `/spek:execute`..." to name both exceptions — execute ticking Plan checkboxes and verify ticking Assumptions checkboxes. (2) Section ownership table (lines ~74–81): add a row for `## Assumptions` — owned by `/spek:discuss` (writes), `/spek:verify` (ticks checkboxes). (3) "The single section-ownership exception" section: update the heading to "Section-ownership exceptions", update the block-quoted rule to cover both cases, and extend the prose to explain the Assumptions/verify carve-out with the same reasoning as the Plan/execute one. No other content touched.

#### 7. Fix `verify.md` — item 7 wording and Reads "if present" qualifier

**Files:** `skills/verify.md`, `.claude/commands/spek/verify.md`

**Approach:** Two targeted edits. (1) "What to check" item 7: change "Mark `[x]` for confirmed" to "Mark `[x]` directly in `spec.md`'s `## Assumptions`" so there's no ambiguity about where the tick goes. (2) Reads item 4: add "(if present)" qualifier — "read `## Assumptions` section (if present)" — so specs predating this feature don't cause an error or a misleading empty-section report. Sync to `.claude/commands/spek/verify.md`.

#### 8. Fix example 001 Verification to match canonical format

**Files:** `examples/001_toy-feature/spec.md`

**Approach:** Two targeted edits to the `## Verification` section. (1) Add `**Status:** READY_TO_SHIP` as the final line — the verify.md template mandates this line and the example must demonstrate it. (2) Ensure `**Assumptions check:**` is its own standalone bold line (matching the template's block structure) rather than prose appended to the Principles check — the example should show the exact format a real verify run produces.

#### 9. Fix `verify.md` — two Writes guards for missing `## Assumptions` section

**Files:** `skills/verify.md`, `.claude/commands/spek/verify.md`

**Approach:** Two targeted edits to the Writes section. (1) The paragraph beginning "After writing the Verification section, tick confirmed assumptions…" should open with "If `## Assumptions` is present and has entries," — mirroring the existing Reads guard and preventing an agent from attempting to edit a section that doesn't exist in pre-feature specs. (2) The `*(omit section if ## Assumptions is empty)*` note in the Assumptions check block should clarify what "empty" means: a comment-only section (no `- [ ]` or `- [x]` entries) counts as empty. Sync to `.claude/commands/spek/verify.md`.

#### 10. Fix `discuss.md` — update frontmatter description field

**Files:** `skills/discuss.md`, `.claude/commands/spek/discuss.md`

**Approach:** Single edit to the `description:` frontmatter field — update from "Writes Context and Discussion sections" to "Writes Context, Discussion, and Assumptions sections" so the command palette entry accurately reflects the skill's current scope. Sync to `.claude/commands/spek/discuss.md`.

## Verification

**Task-by-task check:**
- Task 1 — Add `## Assumptions` to `spec.md.tmpl`: ✓ — section inserted between Discussion and Plan in both `_templates/spec.md.tmpl` and `.specs/_templates/spec.md.tmpl`; HTML comment + placeholder present (`diff _templates/spec.md.tmpl` lines +118–128)
- Task 2 — Add assumption-prompting step to `discuss.md`: ✓ — Reads item 4 updated, close-of-discussion prompt added to Behavior, Writes step 3 added (steps renumbered to 3–5), Hard rules section-ownership line added; synced to `.claude/commands/spek/discuss.md`
- Task 3 — Add assumption-verification pass to `verify.md`: ✓ — Reads item 4 has "(if present)", item 7 added to "What to check", Assumptions check block in Writes template, checkbox-ticking paragraph added, Hard rules updated; synced to `.claude/commands/spek/verify.md`
- Task 4 — Update examples: ✓ — 001 has 3 ticked assumptions + Assumptions check/Goal check/Issues found/Status in Verification; 002 has empty section with extended HTML comment noting no discuss pass
- Task 5 — Sync changed files: ✓ — all three source files synced to `.claude/commands/spek/` and `.specs/_templates/`; no global install present
- Task 6 — Update `docs/architecture.md`: ✓ — invariant 2 updated for both exceptions, `## Assumptions` row added to ownership table, "Section-ownership exceptions" section renamed and extended with second carve-out and `when verify runs` paragraph
- Task 7 — Fix `verify.md` wording + qualifier: ✓ — Reads item 4 reads "## Assumptions (if present, for what was taken as given)"; item 7 says "Mark [x] directly in spec.md's ## Assumptions"; synced to installed copy
- Task 8 — Fix example 001 Verification format: ✓ — `**Status:** READY_TO_SHIP` added as final line; Assumptions check, Goal check, Issues found all present as standalone blocks
- Task 9 — Fix `verify.md` two Writes guards: ✓ — checkbox-ticking paragraph now opens "if `## Assumptions` is present and has checkbox entries"; omit note reads "absent or has no checkbox entries — a comment-only section counts as empty"; synced
- Task 10 — Fix `discuss.md` frontmatter description: ✓ — description field reads "Writes Context, Discussion, and Assumptions sections"; synced to installed copy

**Principles check:**
- Skill files ≤ ~300 lines: ✓ — discuss.md ~97 lines, verify.md ~127 lines; both well within limit
- HTML comments for inline guidance: ✓ — template section comment is HTML, not visible text
- Section ownership strict: ✓ — principles.md, architecture.md, and both skill Hard rules declare the exception consistently
- Sync rule: ✓ — all modified files in `skills/` and `_templates/` replicated to `.claude/commands/spek/` and `.specs/_templates/`; the `skills/new.md` unplanned-touch concern from the prior pass is resolved — both copies committed in the same commit
- Examples are canonical output: ✓ — both examples match the format a real workflow run would produce

**Goal check:** The implementation achieves all three stated success criteria from Context: `spec.md.tmpl` has the `## Assumptions` section in the correct position (after `## Discussion`, before `## Plan`); `/spek:discuss` prompts for assumptions at the close of conversation and owns the write; `/spek:verify` includes the full assumption-verification pass with checkbox-ticking and unverifiable flagging. All four issues from the first verify pass are resolved (tasks 7–10). No new files were created, no architecture was changed — only additive modifications to existing files.

**Issues found:**
None.

**Status:** READY_TO_SHIP
