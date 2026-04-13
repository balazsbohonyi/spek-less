---
id: 020
title: incorrect tasks format
status: done
part_of: SpekLess
starting_sha: b9e5fde
created: 2026-04-14
tags: []
---

# incorrect tasks format

## Context

> Part of [**SpekLess**](../project.md).

A broader audit of specs 018 and 019 (both produced by `/spek:ingest`) reveals several structural deviations from the spec template, not just the tasks format. The `/spek:ingest` skill produces specs that diverge from `_templates/spec.md.tmpl` in five ways:

1. **Tasks format** — tasks use unordered lists (`- [x] Task N:` or `- [x] N. description`) instead of the canonical ordered numbered checkboxes (`1. [ ] <short task title>`). Affects both 018 and 019.
2. **Frontmatter quoting** — `id:` and `title:` values are wrapped in double quotes; the template emits them unquoted. Affects both 018 and 019.
3. **Missing `tags: []`** — the frontmatter field is absent entirely. Affects both 018 and 019.
4. **`> Part of` placement** — spec 018 places the back-reference line under the H1 title instead of inside `## Context`. Spec 019 gets this right.
5. **Non-standard `### Goal` subsection** — spec 019 adds a `### Goal` block inside `## Plan` that is not in the template and is not produced by any other skill.

The goal is to: (a) fix `/spek:ingest` to emit structurally correct specs going forward, and (b) retroactively correct both 018 and 019. The `### Details` format is deliberately left as-is — both specs use content-appropriate formats (Old/New diffs, Replace/With blocks) that are more informative than the generic `**Files:**`/`**Approach:**` skeleton in the template, which is a fill-in prompt, not a mandatory structure.

## Discussion

<!--
The exploration phase: alternatives considered, key decisions made, ambiguities resolved.
This is the record of *how* we decided what we decided.
Written by /spek:discuss. Fully rewritten on re-run.
-->

**Unified root cause:** `skills/ingest.md` does not read `_templates/spec.md.tmpl`. The template is not in its `## Reads` section. As a result, when Step 5 constructs specs from scratch, it has no structural reference and inevitably diverges from the template in ways that only surface when the output is compared to it after the fact. Individual deviations (tasks format, frontmatter quoting, `> Part of` placement, non-template subsections) are all symptoms of this single omission.

**Fix strategy — comprehensive, not targeted:** Add `_templates/spec.md.tmpl` to the ingest skill's `## Reads` section and update Step 5 to state explicitly that the template is the authoritative structural reference for every spec the skill creates — frontmatter field names and format, section order, section headings, subsection structure. Content comes from the source material; structure comes from the template. Nothing is added that isn't in the template (no extra subsections, no extra frontmatter fields). This is a single principled fix that covers all known deviations and prevents future ones without needing a per-deviation callout list.

**Why not a per-callout approach:** Listing specific callouts for each deviation (tasks format, frontmatter quoting, etc.) would fix the five known issues but leave the skill structurally fragile — the next ingest run on unusual source material could introduce a sixth deviation. Anchoring to the template file solves the class of problem.

**Details format:** Not changed. When ingest produces a `planning` spec from source material that already has detailed task descriptions (diff blocks, Old/New text), reproducing those details is strictly more useful than forcing everything into `**Files:**`/`**Approach:**` slots. The template's Details format is a scaffold for Claude to fill; ingest already has filled content.

**Retroactive correction of 018 and 019:** In scope for all five structural deviations identified in the audit. Both specs are fully executed (all tasks `[x]`); corrections are cosmetic but restore corpus consistency. The `### Details` sections of both specs are not touched.

## Assumptions

None. No external dependencies — this is a contained edit to a single skill file.

## Plan

### Tasks

1. [x] Fix `skills/ingest.md` — add template to Reads and anchor Step 5 to template structure
2. [x] Sync `ingest.md` to installed copies
3. [x] Retroactively correct spec 018
4. [x] Retroactively correct spec 019

### Details

#### 1. Fix `skills/ingest.md` — add template to Reads and anchor Step 5 to template structure

**Files:** `skills/ingest.md`

**Approach:** Two targeted edits to `skills/ingest.md`. First, add `_templates/spec.md.tmpl` as a new numbered item in the `## Reads` section (after the existing five reads). Second, update Step 5 ("Create specs") to declare that `_templates/spec.md.tmpl` is the authoritative structural reference: frontmatter field names, order, and format come from the template; section order and headings come from the template; subsections not present in the template must not appear. Content (Context narrative, Discussion body, task text, Assumptions) comes from the ingested source. The existing Details-format exception for `planning` specs — allowing Old/New diff blocks rather than the `**Files:**`/`**Approach:**` skeleton — is explicitly preserved. Docs evaluated: `docs/architecture.md`, `docs/maintenance.md`, `docs/comparison.md` — this is a bug fix to an existing skill's reads and behavior, not a structural framework change; no doc updates needed.

#### 2. Sync `ingest.md` to installed copies

**Files:** `.claude/commands/spek/ingest.md`, `~/.claude/commands/spek/ingest.md` (if dir exists)

**Approach:** Per the Sync Rule in `principles.md`, copy the updated `skills/ingest.md` to `.claude/commands/spek/ingest.md` (always present in this repo). Then check whether `~/.claude/commands/spek/` exists; if so, copy there too. This is mandatory, not optional.

#### 3. Retroactively correct spec 018

**Files:** `.specs/018_remove-hardcoded-skill-counts-from-docs/spec.md`

**Approach:** Four corrections, none touching `### Details` or `## Verification`. (1) Frontmatter: remove quotes from `id: "018"` → `id: 018` and `title:`, add `tags: []` after `created:`. (2) Move `> Part of [**SpekLess**](../project.md).` from its current position under the H1 title to the first line of `## Context` — the template places the back-reference inside the section, not outside. (3) Convert all 9 task lines from `- [x] Task N: description` unordered-list format to `N. [x] description` numbered-checkbox format, stripping the `Task N: ` prefix; all boxes stay `[x]` since all tasks are complete.

#### 4. Retroactively correct spec 019

**Files:** `.specs/019_fix-status-ordering-bulk-grep-speed/spec.md`

**Approach:** Five corrections, none touching `### Details` or `## Verification`. (1) Frontmatter: remove quotes from `id: "019"` and `title:`, add `tags: []` after `created:`, remove `type: standard` (not a template field — extra frontmatter not in the template must not appear, consistent with the fix strategy in Discussion). (2) Convert all 7 task lines from `- [x] N. description` unordered-list format to `N. [x] description` numbered-checkbox format; all boxes stay `[x]`. (3) Remove the `### Goal` subsection and its content from `## Plan` — it is not in the template and is not produced by any other skill.

## Verification

**Task-by-task check:**
- Task 1 — Fix `skills/ingest.md`: ✓ — diff shows read #6 added for `_templates/spec.md.tmpl`; "Structural reference" block with 5 bullets added after frontmatter construction rules
- Task 2 — Sync `ingest.md` to installed copies: ✓ — `.claude/commands/spek/ingest.md` diff is identical to `skills/ingest.md`; execution log confirms `~/.claude/commands/spek/` was absent (no global copy needed)
- Task 3 — Retroactively correct spec 018: ✓ — quotes removed from `id`/`title`; `tags: []` added after `created:`; `> Part of` moved from under H1 into `## Context`; all 9 task lines converted from `- [x] Task N: description` to `N. [x] description`
- Task 4 — Retroactively correct spec 019: ✓ — quotes removed from `id`/`title`; `type: standard` removed; `tags: []` added; `### Goal` subsection removed; all 7 task lines converted to `N. [x] description`

**Principles check:**
- Single-agent topology: ✓ — no sub-agents spawned
- Section ownership: ✓ — execution only touched `skills/ingest.md`, installed copies, and fully-executed retroactive specs; did not alter mid-flight spec sections
- Document as state: ✓ — no STATE.md, lockfiles, or checkpoint files introduced
- Append-only execution log: ✓ — `execution.md` shows only appended entries, none edited
- Skill files ≤ ~300 lines: ✓ — `skills/ingest.md` is 149 lines after the edits
- Sync Rule: ✓ — `.claude/commands/spek/ingest.md` updated; global dir absent, correctly skipped
- `_templates/spekless-block.md.tmpl`: ✓ — no new skill added; no update required

**Goal check:** The feature had two declared goals: (a) fix `/spek:ingest` to emit structurally correct specs going forward, and (b) retroactively correct specs 018 and 019. Both are achieved. The skill now reads `spec.md.tmpl` as its authoritative structural reference, which closes the root cause (not just the five symptom deviations). Retroactive corrections to 018 and 019 address all five identified deviations. One non-issue to note: the retroactive corrections insert `tags: []` after `created:` rather than reordering all frontmatter fields to match the template's exact sequence — field order in YAML frontmatter is not semantically significant, and order-resequencing was not among the five identified deviations nor required by the plan approach text.

**Issues found:**
None.

**Status:** READY_TO_SHIP
