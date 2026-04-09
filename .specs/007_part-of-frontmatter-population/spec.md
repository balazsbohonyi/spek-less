---
id: 007
title: part_of frontmatter population
status: done
part_of: SpekLess
starting_sha: 1b57941
created: 2026-04-09
tags: []
---

# part_of frontmatter population

> Part of [**SpekLess**](../project.md).

## Context

The `part_of:` frontmatter field exists in `spec.md.tmpl` and is read by `/spek:status` for grouping features by project. It is intended to be populated when a feature belongs to a named project (from `project.md`), or when a feature is split into sibling specs via the `/spek:plan` decomposition path (>8 tasks).

However, none of the three entry-point skills — `/spek:new`, `/spek:adopt`, and `/spek:kickoff`'s scaffolding offer — currently set this field in frontmatter. They each add a prose back-reference under `## Context` (`> Part of [**<project>**](../project.md).`) when `project.md` exists, but leave `part_of:` blank in frontmatter. The field is only populated when `/spek:plan` triggers a decomposition suggestion.

Result: any feature spec created while a `project.md` exists has an empty `part_of:` frontmatter, making it invisible to grouping in `/spek:status` and inconsistent with the prose reference that already exists in the Context section.

Goal: make `part_of:` in frontmatter truthful by default — populated whenever a feature is created within a project that has `project.md`.

## Discussion

The fix is symmetric across all three entry-point paths: when `project.md` exists, read its `name:` frontmatter field and write `part_of: <name>` in the new spec's frontmatter. This is the same trigger already used for the prose back-reference, so there's no new conditional logic to introduce.

Key decisions:
- **Same trigger, same three places.** `/spek:new` step 4, `/spek:adopt` step 5, and `/spek:kickoff`'s scaffolding loop all already have the `if project.md exists` branch — the change is to also set the frontmatter field there.
- **No change to `/spek:plan`.** The decomposition path already sets `part_of:` correctly.
- **Spec 006 is a known casualty.** `.specs/006_rename-templates-directory/spec.md` was created via `/spek:new` while `project.md` existed; it has empty `part_of:` and should be patched as a one-line fix alongside the skill updates.

## Plan

### Tasks

1. [x] Update `skills/new.md` — set `part_of:` in frontmatter when `project.md` exists
2. [x] Update `skills/adopt.md` — set `part_of:` in frontmatter when `project.md` exists
3. [x] Update `skills/kickoff.md` — set `part_of:` in each scaffolded spec's frontmatter
4. [x] Patch `.specs/006_rename-templates-directory/spec.md` — set `part_of: SpekLess`

### Details

#### 1. Update `skills/new.md` — set `part_of:` in frontmatter when `project.md` exists

**Files:** `skills/new.md`

**Approach:** In the Behavior section, step 4 already says "If `project.md` exists, add a single line under `## Context`…". Extend that same step to also set `part_of: <project_name>` in the spec's frontmatter (reading the `name:` field from `project.md`'s frontmatter). No new conditional needed — same branch, one more write.

#### 2. Update `skills/adopt.md` — set `part_of:` in frontmatter when `project.md` exists

**Files:** `skills/adopt.md`

**Approach:** In Actions step 3, Frontmatter subsection, the bullet list currently sets `id`, `title`, `status`, `starting_sha`. Add `part_of: <project_name>` to that list with the condition "when `project.md` exists, read its `name:` field." Step 5 already adds the Context prose link — this is just the frontmatter counterpart.

#### 3. Update `skills/kickoff.md` — set `part_of:` in each scaffolded spec's frontmatter

**Files:** `skills/kickoff.md`

**Approach:** In the Scaffolding offer section, the option 1 handler says "create `.specs/NNN_<slug>/` with a skeleton `spec.md`" and adds a Context prose link. Add a step to also write `part_of: <project_name>` in each scaffolded spec's frontmatter. The project name is already known from the kickoff conversation (it's the `name:` field being written to `project.md`).

#### 4. Patch `.specs/006_rename-templates-directory/spec.md` — set `part_of: SpekLess`

**Files:** `.specs/006_rename-templates-directory/spec.md`

**Approach:** One-line frontmatter edit: change `part_of:` to `part_of: SpekLess`.

## Verification

**Task-by-task check:**
- Task 1 — Update `skills/new.md`: ✓ — step 4 split into two sub-bullets; `part_of: <project_name>` frontmatter set first, then prose Context link. `skills/new.md:31-33`
- Task 2 — Update `skills/adopt.md`: ✓ — new bullet added to Frontmatter list: `part_of: <project_name>` conditioned on `project.md` existing. `skills/adopt.md:49`
- Task 3 — Update `skills/kickoff.md`: ✓ — `part_of: <project_name>` bullet inserted before the Context prose link in the option 1 handler. `skills/kickoff.md:79`
- Task 4 — Patch spec 006: ✓ — `part_of:` → `part_of: SpekLess`. `.specs/006_rename-templates-directory/spec.md:5`

**Principles check:**
- Skill files follow standard sections convention: ✓ — only existing Behavior/Actions sections were extended; no structural changes.
- Skill files stay under ~300 lines: ✓ — new.md: 61, adopt.md: 83, kickoff.md: 118. All well within budget.
- No linter/formatter: ✓ — no tooling touched.
- Single-agent topology: ✓ — no sub-agents introduced.
- Section ownership: ✓ — no spec.md sections altered beyond checkbox ticks and the Verification section.

**Goal check:** The Context states the goal is to make `part_of:` in frontmatter truthful by default whenever a feature is created within a project that has `project.md`. All three entry-point paths (`/spek:new`, `/spek:adopt`, `/spek:kickoff` scaffolding) now set the field using the same trigger and the same `name:` field source already used for the prose back-reference. The existing `/spek:plan` decomposition path was correctly left untouched. Spec 006 is retroactively corrected. Goal achieved.

**Issues found:**
None.

**Status:** READY_TO_SHIP
