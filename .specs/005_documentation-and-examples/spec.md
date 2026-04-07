---
id: "005"
title: Documentation and Examples
status: done
part_of: SpekLess
starting_sha: fc95b27
created: 2026-04-07
tags: [docs, examples]
---

# Documentation and Examples

## Context

> Part of [**SpekLess**](../project.md). See "Initial Feature Set" for one-line scope.

The user-facing documentation and worked examples that make SpekLess learnable and trustworthy. Without these, a developer installing SpekLess has no reference for what correct output looks like, no understanding of why design decisions were made, and no basis for evaluating whether SpekLess fits their workflow better than alternatives.

**Goal:** A developer can install SpekLess, read `README.md`, and understand the full workflow without asking any questions. The architecture doc gives contributors enough context to make changes without breaking invariants. The examples show exactly what real output looks like.

**Deliverables:**
- `README.md` — user-facing intro, install instructions, workflow walkthrough, skills table
- `docs/architecture.md` — authoritative design reference, invariants, ownership model
- `docs/comparison-with-gsd-and-speckit.md` — what SpekLess keeps, rejects, and invents vs alternatives
- `examples/001_toy-feature/` — greenfield workflow output (spec.md + execution.md)
- `examples/002_adopted-feature/` — retroactive `/spek:adopt` output (spec.md only, no execution.md)

## Discussion

> **Retroactively adopted.**

Key decisions:
- **`docs/architecture.md` is the source of truth** — when code and docs conflict, the code may be wrong but the architecture doc is authoritative. Changes to design must update architecture.md first.
- **Examples are canonical output** — any change to templates or skills that would change example shape must also update the examples. They are not aspirational — they show what real runs produce.
- **CLAUDE.md is for contributors, not users** — user-facing content lives in README.md. CLAUDE.md contains invariants, conventions, and "things deliberately missing" that only matter to someone editing the framework.
- **Comparison doc prevents feature-envy additions** — explicitly documents what GSD/SpecKit have that SpekLess deliberately omits, and why.

## Plan

### Tasks

1. [x] `README.md` — user-facing intro with install steps, skills table, workflow walkthrough
2. [x] `docs/architecture.md` — authoritative design reference: section ownership, agent topology, invariants
3. [x] `docs/comparison-with-gsd-and-speckit.md` — feature matrix and rationale for SpekLess design choices
4. [x] `examples/001_toy-feature/` — complete greenfield workflow: spec.md with all sections filled + execution.md
5. [x] `examples/002_adopted-feature/` — retroactive adopt: spec.md with inferred Context, pre-checked tasks, no execution.md

### Details

#### 1. `README.md`
**Files:** `README.md`
**Approach:** One-paragraph pitch, install command, skills table (name, one-line description, when to use), workflow diagram or ordered list, link to architecture.md for deeper reading.

#### 2. `docs/architecture.md`
**Files:** `docs/architecture.md`
**Approach:** Documents section ownership table, agent topology rules, file layout, skill conventions, and the "why" behind each invariant. Updated whenever a core invariant changes.

#### 3. `docs/comparison-with-gsd-and-speckit.md`
**Files:** `docs/comparison-with-gsd-and-speckit.md`
**Approach:** Feature matrix table. For each GSD/SpecKit capability, notes whether SpekLess has it, deliberately omits it, or inverts it — with one-line rationale.

#### 4. `examples/001_toy-feature/`
**Files:** `examples/001_toy-feature/spec.md`, `examples/001_toy-feature/execution.md`
**Approach:** Shows a realistic greenfield feature (not a trivial hello-world). All spec.md sections filled. execution.md has 5-8 realistic entries showing task progression and at least one course-correction.

#### 5. `examples/002_adopted-feature/`
**Files:** `examples/002_adopted-feature/spec.md`
**Approach:** Shows `/spek:adopt` output on a feature that predates SpekLess. Context inferred from code. All Plan tasks pre-checked. No execution.md (work predates the framework). `status: done`.

## Verification

**Task-by-task check:**
- Task 1 — `README.md`: ✓ — 339-line file with install steps, 10-skill table, 3 walkthroughs (greenfield, feature, adopt), intervention guide, directory layout, and principles overview
- Task 2 — `docs/architecture.md`: ✓ — section ownership table, agent topology rules, current-feature discovery, context engineering tactics, intervention mechanics, and "deliberately missing" list all present
- Task 3 — `docs/comparison-with-gsd-and-speckit.md`: ✓ — feature matrix table plus per-section rationale for GSD and SpecKit keeps/rejects; novel SpekLess concepts documented
- Task 4 — `examples/001_toy-feature/`: ✓ — spec.md fully filled (all sections, all tasks checked, `status: done`); execution.md now contains the required course-correction entry (09:54 — matchMedia listener missing applyTheme() call, fixed in-scope); headings corrected from `##` to `####` throughout to match the template; mock commit entries removed (appropriate: `suggest_commits` defaults to false)
- Task 5 — `examples/002_adopted-feature/`: ✓ — spec.md only (no execution.md), Context clearly marked as inferred via `/spek:adopt`, all Plan tasks pre-checked, `status: done`

**Principles check:**
- Documentation (README is user-facing, architecture.md is contributor): ✓ — clear separation; CLAUDE.md references architecture.md for contributors and README.md for users
- Examples are canonical output: ✓ — examples now match expected workflow output shape; course-correction entry demonstrates the append-only log's intervention mechanic
- No secrets in skill files or templates: ✓
- HTML comments as inline guidance in templates: ✓ — not applicable to these deliverables (docs/examples, not templates)

**Goal check:** A developer can install SpekLess, read `README.md`, and understand the full workflow — achieved. The three walkthroughs cover greenfield, feature, and adopt paths with concrete commands and expected outputs. `docs/architecture.md` gives contributors enough context to maintain invariants. Both examples are realistic and complete: `examples/001_toy-feature/execution.md` now includes a course-correction entry that models both the discovery and resolution pattern, which is the most illustrative part of the log for new users. All deliverables are present.

**Issues found:** None.

**Status:** READY_TO_SHIP
