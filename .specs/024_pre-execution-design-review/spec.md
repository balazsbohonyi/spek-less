---
id: 024
title: pre-execution design review
status: done
part_of: SpekLess
starting_sha: c708dd3
created: 2026-04-17
tags: []
---

# pre-execution design review

## Context

> Part of [**SpekLess**](../project.md).

SpekLess currently moves directly from `spek:plan` to `spek:execute`, with `spek:verify` evaluating the result only after implementation. That leaves a gap in the workflow: a weak plan can survive unchanged until it causes expensive execution churn, mid-implementation replanning, or verify-time failures that could have been caught earlier.

This feature adds an optional, user-invoked design review step for planned work. The goal is to let a developer deliberately review the quality of the spec itself before execution begins, using the same advisory-only philosophy as the rest of SpekLess. Success means a new read-only skill can review Context, Discussion, Plan, project constraints, and principles; write a structured `## Review` section with categorized findings; and recommend whether the user should revise the plan, revise scope, or proceed to execution.

Out of scope: modifying the plan automatically, reading or changing source code, introducing a new lifecycle status, or turning review into an implicit pipeline step. The skill should remain lightweight, explicit, and optional.

## Discussion

The main design choice was whether review should be a built-in workflow phase or a user-invoked advisory checkpoint. The chosen direction is a standalone `spek:review` skill that the developer runs deliberately between planning and execution. That preserves SpekLess's lightweight, single-agent, advisory model and avoids the hidden orchestration style associated with systems like GSD's internal `plan-checker`.

Another open question was how permissive the skill should be when no real plan exists yet. The decision is to keep it strict: `spek:review` is for pre-execution design review, not early brainstorming. If `## Plan` is missing or still skeletal, the skill should stop and direct the user to run `spek:plan` first instead of pretending to review incomplete material.

We also resolved lifecycle behavior. Even though review sits conceptually between planning and execution, it should not introduce a new `reviewing` status or any extra state field. The current lifecycle remains unchanged; review records its output in `## Review` only. This keeps status semantics stable across skills, docs, and examples while still giving the user a durable review artifact inside the spec.

The review itself is meant to behave like a senior engineer reading the design, not the code. It should read Context, Discussion, Assumptions, Plan, `principles.md`, and `project.md`, then look for concrete design weaknesses before execution starts. Architectural checks should catch the wrong abstraction level, unnecessary coupling between layers or modules, circular dependencies, or plans that wire concerns together directly when some indirection is needed. Missing-task checks should compare the behavior promised in Context against the actual decomposition in Plan and call out obvious omissions such as error handling, loading or empty states, cleanup paths, rollback strategy, or data migration work. The review should not just say "missing edge cases" in the abstract; it should point to the specific promised behavior or constraint that the plan failed to decompose.

Principles review should be explicit and task-by-task. If a task's stated Approach conflicts with a principle in `principles.md`, the review should name the task, cite the principle, and explain the mismatch before code exists. Scope review should also run in both directions: it should flag over-scoping when the Plan includes "while we're at it" work that exceeds Context, and it should flag under-scoping when Context describes multiple user-facing behaviors or constraints that the task list barely covers. Simplicity review should revisit the alternatives already captured in Discussion and ask whether the chosen plan still looks justified now that file-level implementation details are on the table. If a previously rejected approach has become the cleaner option, that is a legitimate review finding, not second-guessing for its own sake.

Dependency and risk review should treat unstated bets as first-class findings. If the Plan assumes a third-party package, internal API behavior, undocumented data shape, or migration precondition that is not reflected in Assumptions, the review should flag it as something that can derail execution if wrong. Task-ordering review should also be concrete: it should note where independent tasks are serialized unnecessarily, where dependencies are implicit instead of stated, and where future parallel execution would be blocked by a weak decomposition. The goal is not to force parallelism now, but to ensure the plan expresses dependency structure clearly enough to reason about.

An additional workflow decision emerged once `## Review` became a durable section. If the user triggers `spek:review` and receives findings, the result cannot be a dead-end note that downstream skills ignore. The clean model is section ownership plus shared read awareness: `spek:review` alone owns and rewrites `## Review`, but `spek:plan` must read that section when it exists, and `spek:discuss` must read it when the user returns to discussion after review. That makes review operational without breaking ownership boundaries.

The recommended downstream behavior is conditional but explicit. `spek:plan` should always read `## Review` when present and, when replanning after review, revise the Plan to address unresolved `critical` and `warning` findings rather than silently producing another plan beside them. `spek:discuss` should read `## Review` only when the user has routed back there because the review exposed scope, ambiguity, dependency, or architectural issues that belong in Context, Discussion, or Assumptions. Neither skill should rewrite or delete `## Review`, and neither should assume that every finding is binding; review remains advisory until the user decides to act on it. If the user dismisses the review and proceeds anyway, that should happen explicitly in the conversation, not by silent omission.

Findings are categorized as `critical`, `warning`, or `note`, and the end of the skill should offer the user a concrete choice: revise the plan, proceed to execution and accept the risk, or revisit scope via `spek:discuss`. An important constraint from SpekLess's section-ownership model remains unchanged: review owns `## Review` and nothing else. It fully rewrites that section on re-run, never edits `## Plan`, never touches source files, and stays read-only with respect to the implementation. The resulting skill differentiates SpekLess by making design review an explicit developer decision rather than an opaque sub-agent pipeline step.

## Assumptions

None. No external bets identified - this task has no dependencies on third-party behavior, data contracts, or scale limits beyond the existing SpekLess spec structure and principles model.

## Plan

### Tasks

1. [x] Add `## Review` to the core spec structure and architecture rules
2. [x] Create the `spek:review` skill and rendered installed copies
3. [x] Teach `spek:plan` and `spek:discuss` to consume review feedback correctly
4. [x] Update user-facing and contributor docs for the new review workflow
5. [x] Refresh worked examples to match the new spec shape and workflow
6. [x] Smoke-test rendering, sync, and generated artifacts for the added skill

### Details

#### 1. Add `## Review` to the core spec structure and architecture rules

**Files:** `_templates/spec.md.tmpl`, `docs/architecture.md`

**Approach:** Add a dedicated `## Review` section to the canonical spec template so review has an explicit, stable home in every feature doc. Update the architecture doc to define review's ownership, placement relative to Plan and Verification, and the downstream rule that `spek:plan` and `spek:discuss` may read review findings without taking ownership of that section. Keep the lifecycle unchanged so the plan stays aligned with the existing status model and section-ownership principles.

#### 2. Create the `spek:review` skill and rendered installed copies

**Files:** `skills/review.md`, `.claude/commands/spek/review.md`, `.opencode/commands/spek/review.md`, `.codex/skills/spek-review/SKILL.md`, `install.js`

**Approach:** Author a new workflow skill in canonical source form that reads Context, Discussion, Assumptions, Plan, `principles.md`, and `project.md`, writes only `## Review`, and ends with the explicit next-move choice discussed in this spec. The review report should classify findings as `critical`, `warning`, or `note`, and its checks should concretely cover architectural red flags, missing decomposition, principle conflicts, overscoping, simpler alternatives, unstated dependencies, and task-ordering issues. Verify whether `install.js` already discovers skills dynamically; if not, update it so the new skill renders and syncs correctly for Claude Code, OpenCode, and Codex without violating the no-BOM Codex packaging rule.

#### 3. Teach `spek:plan` and `spek:discuss` to consume review feedback correctly

**Files:** `skills/plan.md`, `skills/discuss.md`, `.claude/commands/spek/plan.md`, `.claude/commands/spek/discuss.md`, `.opencode/commands/spek/plan.md`, `.opencode/commands/spek/discuss.md`, `.codex/skills/spek-plan/SKILL.md`, `.codex/skills/spek-discuss/SKILL.md`

**Approach:** Extend the planning and discussion skill instructions so review is operational rather than decorative. `spek:plan` should read `## Review` when present and, on a replan triggered by review, explicitly address unresolved `critical` and `warning` findings in the rewritten Plan; `spek:discuss` should read `## Review` when the user returns there because review surfaced scope, ambiguity, dependency, or architectural issues. Preserve section ownership: these skills may consume review findings, but only `spek:review` rewrites `## Review`.

#### 4. Update user-facing and contributor docs for the new review workflow

**Files:** `README.md`, `CLAUDE.md`, `docs/comparison.md`, `docs/maintenance.md`

**Approach:** Add `spek:review` everywhere the installed skill set, workflow sequence, or framework comparison is documented. Update the README walkthroughs and skill inventory so users understand when to invoke review and how it differs from verify; update contributor guidance so future edits preserve review's ownership and sync requirements; and update the comparison doc to explain the new design-review checkpoint relative to GSD's internal `plan-checker` model.

#### 5. Refresh worked examples to match the new spec shape and workflow

**Files:** `examples/001_toy-feature/spec.md`, `examples/002_adopted-feature/spec.md`

**Approach:** Bring the canonical examples back in line with the framework after the spec structure changes. At minimum, both examples should reflect the presence of the `## Review` section in the living spec shape; if useful, the greenfield example can also demonstrate what a completed review looks like so users can see the intended report format and how review fits between planning and execution.

#### 6. Smoke-test rendering, sync, and generated artifacts for the added skill

**Files:** `install.js`, `.specs/_templates/`, `.claude/commands/spek/`, `.opencode/commands/spek/`, `.codex/skills/`

**Approach:** Run the manual smoke test required by `principles.md` and `docs/maintenance.md` for a non-trivial framework change. Confirm the installer renders the new skill for all supported agents, generated specs include the `## Review` section with no leftover placeholders, and the repo's installed copies stay in sync with source changes. This also verifies that no manual packaging step was missed for the Codex, Claude Code, or OpenCode variants.

## Verification

**Task-by-task check:**
- Task 1 - Add `## Review` to the core spec structure and architecture rules: ✓ - `_templates/spec.md.tmpl:71-79` adds the dedicated `## Review` section, and `docs/architecture.md` defines its ownership and placement.
- Task 2 - Create the `spek:review` skill and rendered installed copies: ✓ - `skills/review.md:1-98` implements the review skill, and the rendered copies exist under `.claude/commands/spek/review.md`, `.opencode/commands/spek/review.md`, and `.codex/skills/spek-review/SKILL.md`.
- Task 3 - Teach `spek:plan` and `spek:discuss` to consume review feedback correctly: ✓ - `skills/plan.md:20,67,117,125` and `skills/discuss.md:19,31,93` now read `## Review` when appropriate without taking ownership of it.
- Task 4 - Update user-facing and contributor docs for the new review workflow: ✓ - `README.md`, `CLAUDE.md`, `docs/comparison.md`, and `docs/maintenance.md` were updated to document the review checkpoint and how it differs from execute/verify.
- Task 5 - Refresh worked examples to match the new spec shape and workflow: ✓ - `examples/001_toy-feature/spec.md` and `examples/002_adopted-feature/spec.md` were updated to reflect the review-era spec shape and workflow.
- Task 6 - Smoke-test rendering, sync, and generated artifacts for the added skill: ✓ - `install.js:765-769` shows the installer next-step rendering updated for the review-inclusive workflow, and the synced agent-specific review copies plus rendered template output confirm the smoke-test coverage described in `execution.md`.

**Principles check:**
- Single-agent topology: ✓ - `skills/review.md:91-98` keeps review as an explicit main-conversation checkpoint rather than a hidden pipeline step.
- Section ownership is strict: ✓ - `skills/review.md:79,93-98`, `skills/plan.md:67,122-125`, and `skills/discuss.md:31,93-96` keep `## Review` write-owned only by `spek:review`.
- The document is the state: ✓ - the new checkpoint is recorded inside `spec.md`; no extra state files or lifecycle fields were introduced.
- Append-only execution log: ✓ - `execution.md` was appended to rather than rewritten.
- Sync Rule: ✓ - the canonical review skill and the review-aware `plan`/`discuss` updates were mirrored into the installed Claude Code, OpenCode, and Codex copies.

**Goal check:** The implementation achieves the stated goal for this feature. SpekLess now has an explicit, optional, advisory pre-execution review step: a dedicated `spek:review` skill, a durable `## Review` section in the spec shape, and downstream `plan`/`discuss` instructions that can consume review findings without violating section ownership. Per user clarification, later unrelated edits from specs `015` and `025` were excluded from this verification pass.

**Issues found:** None.

**Status:** READY_TO_SHIP
