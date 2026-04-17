---
id: 025
title: retrospective with principle extraction
status: done
part_of: SpekLess
starting_sha: e34c184
created: 2026-04-17
tags: []
---

# retrospective with principle extraction

## Context

> Part of [**SpekLess**](../project.md).

SpekLess currently ends the feature loop at verification and `done`. That leaves no built-in mechanism for learning from completed work. Each finished feature becomes a closed record rather than an input into better planning, verification, and principle setting for the next one, so the same mistakes can repeat across multiple cycles.

This feature adds an explicit post-completion retrospective step focused on extracting reusable lessons from the spec corpus itself. The goal is not celebration or project archaeology; it is to convert completed feature history into concrete process improvements, especially candidate additions to `.specs/principles.md` and sharper guidance for future planning and review.

Success means a user can run a retrospective only after a feature is substantively complete, get structured analysis of assumptions, execution surprises, verification patterns, and plan quality, and then choose whether to promote repeated lessons into project-wide principles. Out of scope: reading source files, rewriting execution history, or turning retrospective into an automatic end-of-work pipeline.

## Discussion

The main design choice is whether this capability should be treated as ordinary discussion or as a distinct post-completion skill. The clearer fit is a dedicated retrospective step rather than overloading `spek:verify` or `spek:discuss`. Verification is about whether the implementation matches the intended plan; retrospective is about whether the workflow itself produced the right assumptions, task decomposition, and principle guidance. Folding it into verify would blur those purposes and make the final checkpoint heavier than it needs to be.

Another decision is what evidence the retrospective should use. The chosen direction is document-only analysis: the feature spec, the full `execution.md`, and the Verification section. That keeps the token cost moderate and stays aligned with the SpekLess principle that the document is the state. It also avoids turning retrospective into a second verification pass over source code. If the documents do not capture enough signal, that is itself useful feedback about SpekLess's process quality.

The analysis categories are intentionally concrete. Assumption accuracy checks whether "confirmed" assumptions still caused friction in practice. Execution surprise detection uses log density and course corrections as a proxy for underestimated complexity. Verify-fix pattern analysis looks for recurring classes of issues such as missing error handling, test gaps, or over-scoping. Plan decomposition quality asks whether tasks were too large, too small, or poorly sliced. Principle candidate extraction then promotes repeated patterns from those findings into testable project-wide rules.

The gate for running the skill matters. A retrospective on incomplete work is noise, so the skill should run only after `status: done`, or after `verifying` when verification is clean enough that the remaining conversation is no longer about unresolved defects. If open verification issues remain, the correct next move is still execution or replanning, not reflection.

The write model should stay narrow. The likely home is a dedicated `## Retrospective` section in `spec.md`, plus a single principles confirmation step that appends approved candidates to `.specs/principles.md`. That preserves section ownership and keeps retrospective durable without rewriting historical sections such as Discussion, Plan, Verification, or the append-only execution log.

This feature also differentiates SpekLess from adjacent frameworks. A lightweight, user-invoked retrospective gives solo developers an explicit feedback loop that teams often handle informally in meetings and that AI-agent workflows usually skip entirely. The point is to make the framework self-improving: the more completed features exist, the better the next feature's plan, review, and execution can become.

## Assumptions

<!--
Written by spek:discuss. Things taken as given before building - external service
behavior, data contracts, scale limits, third-party availability.
Checkboxes ticked [x] by spek:verify when confirmed in the implementation.
Unverifiable assumptions are flagged explicitly rather than left silently unchecked.
-->

None. No external bets identified - this feature is based on analysis of existing SpekLess documents rather than third-party behavior, data contracts, or scale-sensitive runtime systems.

## Plan

### Tasks

1. [x] Add retrospective ownership to the canonical spec shape and architecture docs
2. [x] Author the `spek:retro` skill in canonical source form
3. [x] Update user-facing and contributor documentation for the new workflow step
4. [x] Refresh examples and rendered install artifacts to match the new skill set
5. [x] Verify installer behavior and any inventory text affected by the added skill
6. [x] Smoke-test generated artifacts for at least one slash-command install and one Codex install
7. [x] Fix the remaining README description of the canonical spec shape
8. [x] Bring `.specs/project.md` in line with the retrospective workflow and skill inventory

### Details

#### 1. Add retrospective ownership to the canonical spec shape and architecture docs

**Files:** `_templates/spec.md.tmpl`, `docs/architecture.md`

**Approach:** Add a dedicated `## Retrospective` section to the canonical spec template so the new skill has an explicit stable write target. Update the architecture doc to define where the section lives, who owns it, what other skills may read it, and the fact that retrospective does not introduce a new lifecycle status or alter append-only execution-log rules.

#### 2. Author the `spek:retro` skill in canonical source form

**Files:** `skills/retro.md`

**Approach:** Create a new post-completion workflow skill that reads `principles.md`, the feature spec, and `execution.md`, gates itself on `done` or cleanly verified work, writes only `## Retrospective`, and conditionally appends confirmed candidate principles to `.specs/principles.md`. Keep the skill principles-aware, section-scoped, idempotent, and read-only for source code, with one AskUserQuestion covering principle additions when candidates exist.

#### 3. Update user-facing and contributor documentation for the new workflow step

**Files:** `README.md`, `CLAUDE.md`, `docs/comparison.md`, `docs/maintenance.md`

**Approach:** Add `spek:retro` everywhere the installed skill set, file inventory, walkthroughs, and framework comparisons are documented. Explain how retrospective differs from verify, where it fits after completion, and what contributors must update when changing this skill or the new `## Retrospective` section.

#### 4. Refresh examples and rendered install artifacts to match the new skill set

**Files:** `examples/001_toy-feature/spec.md`, `examples/002_adopted-feature/spec.md`, `.claude/commands/spek/retro.md`, `.opencode/commands/spek/retro.md`, `.codex/skills/spek-retro/SKILL.md`

**Approach:** Update the canonical examples so the real output shape includes `## Retrospective` in the expected location, with content appropriate to each example's state. Generate the new rendered skill copies for checked-in installs so source and packaged artifacts stay aligned across Claude Code, OpenCode, and Codex.

#### 5. Verify installer behavior and any inventory text affected by the added skill

**Files:** `install.js`, `README.md`, `CLAUDE.md`, `docs/architecture.md`

**Approach:** Confirm whether the installer already discovers skills dynamically enough that no code change is needed for the new command. If inventory text, workflow examples, or post-install guidance hardcode the skill set, update them; if the dynamic installer path already covers packaging, keep `install.js` unchanged and record that the task was verification rather than code modification.

#### 6. Smoke-test generated artifacts for at least one slash-command install and one Codex install

**Files:** `install.js`, `.specs/_templates/`, `.claude/commands/spek/`, `.codex/skills/`

**Approach:** Run the manual smoke test required by `principles.md` and `docs/maintenance.md` for a non-trivial framework change. Verify that a fresh install renders the new skill and `## Retrospective` section correctly, that no stale placeholders remain in generated files, and that Codex packaging still writes UTF-8-without-BOM `SKILL.md` files.

#### 7. Fix the remaining README description of the canonical spec shape

**Files:** `README.md`

**Approach:** Update the lingering high-level README text that still describes the feature spec as ending at `## Verification`. Make the canonical section list and workflow description match the now-shipped retrospective step without duplicating or contradicting the more detailed workflow table below. This addresses the verification finding directly and keeps the user-facing source of truth aligned with the examples and architecture doc.

#### 8. Bring `.specs/project.md` in line with the retrospective workflow and skill inventory

**Files:** `.specs/project.md`

**Approach:** Update the project vision/scope document so its success metrics, in-scope skill inventory, and initial workflow description reflect the added retrospective step. Preserve the existing project framing, but remove the stale counts and task descriptions that still imply a ten-skill, pre-retro workflow. This closes the principles violation around documented skill inventories and gives future planning/verifying runs a consistent project baseline.

## Review

<!--
Written by spek:review. Fully rewritten on re-run.
This is the pre-execution design review checkpoint: findings, simpler alternatives,
missing dependencies, task ordering issues, and principle conflicts discovered after
Discussion and Plan are in place. spek:plan and spek:discuss may read this section
when the user returns to planning/discussion, but only spek:review rewrites it.
-->

## Verification

**Task-by-task check:**
- Task 1 - Add retrospective ownership to the canonical spec shape and architecture docs: ✓ - `_templates/spec.md.tmpl:94` adds `## Retrospective`, and `docs/architecture.md:101`/`108` define its ownership and placement without changing lifecycle ownership.
- Task 2 - Author the `spek:retro` skill in canonical source form: ✓ - `skills/retro.md:1` defines the new skill with completion gating and section-scoped writes, and `.codex/skills/spek-retro/SKILL.md:1` shows the rendered Codex package exists.
- Task 3 - Update user-facing and contributor documentation for the new workflow step: ✓ - `README.md:21`, `README.md:113`, `docs/comparison.md:157`, `docs/maintenance.md:131`, and `CLAUDE.md:29` now describe the retrospective step and its contributor impact consistently.
- Task 4 - Refresh examples and rendered install artifacts to match the new skill set: ✓ - `examples/001_toy-feature/spec.md:117` and `examples/002_adopted-feature/spec.md:108` include `## Retrospective`, and rendered copies exist at `.claude/commands/spek/retro.md`, `.opencode/commands/spek/retro.md`, and `.codex/skills/spek-retro/SKILL.md:1`.
- Task 5 - Verify installer behavior and any inventory text affected by the added skill: ✓ - `install.js:769` adds `retro` to the post-install workflow guidance, and `docs/architecture.md:261` includes `retro.md` in the source tree inventory.
- Task 6 - Smoke-test generated artifacts for at least one slash-command install and one Codex install: ✓ - `execution.md:31`-`32` records successful Claude and Codex scratch installs, and `.codex/skills/spek-retro/SKILL.md:1` is present with the BOM-free `---` header noted in the log.
- Task 7 - Fix the remaining README description of the canonical spec shape: ✓ - `README.md:21` now includes `Assumptions` and `Retrospective` in the canonical section list.
- Task 8 - Bring `.specs/project.md` in line with the retrospective workflow and skill inventory: ✓ - `.specs/project.md:37`, `.specs/project.md:47`-`50`, and `.specs/project.md:82`-`83` now describe the review/retro workflow and 14-skill inventory consistently.

**Principles check:**
- Code Style: ✓ - `skills/retro.md` follows the standard skill-section order and remains comfortably under the size cap, and the spec/examples keep HTML guidance comments intact.
- Architecture: ✓ - `docs/architecture.md:101`, `docs/architecture.md:108`, and `docs/architecture.md:118` give `## Retrospective` explicit ownership while keeping it outside the status lifecycle, matching the single-agent, section-ownership model from `.specs/principles.md:23`-`25`.
- Testing: ✓ - `execution.md:25`-`32` documents the required manual smoke test for both slash-command and Codex installs, satisfying `.specs/principles.md:30`.
- Documentation: ✓ - `README.md:21`, `README.md:113`, `.specs/project.md:47`-`50`, `CLAUDE.md:29`-`30`, and `docs/architecture.md:261` update the documented skill inventories and canonical spec shape as required by `.specs/principles.md:38`.
- Sync Rule: ✓ - rendered installs exist for Claude, OpenCode, and Codex at `.claude/commands/spek/retro.md`, `.opencode/commands/spek/retro.md`, and `.codex/skills/spek-retro/SKILL.md:1`, matching the sync expectations in `.specs/principles.md:45`-`61`.
- Command References: ✓ - canonical source references in `skills/retro.md:28` and `skills/retro.md:84` render to Codex command names in `.codex/skills/spek-retro/SKILL.md:28` and `.codex/skills/spek-retro/SKILL.md:84`, consistent with `.specs/principles.md:74`-`83`.
- Security: ✓ - the feature changes are documentation, templates, and skill/render artifacts only; no new secrets handling or runtime configuration surface was introduced.

**Goal check:** The feature now achieves the stated goal. SpekLess has a dedicated post-completion retrospective step with an explicit `## Retrospective` write target, a completion-gated `spek:retro` skill, updated examples, rendered installs for all supported agents, and top-level documentation/project framing that consistently presents retrospective as part of the shipped workflow. The out-of-scope boundaries were respected: no source-code-reading requirement was added to the retro skill, no execution history was rewritten, and retrospective remains user-invoked rather than automatic.

**Issues found:**
None. The only extra working-tree change in this repo snapshot is `.specs/015_discuss-none-assumptions/spec.md:11`, which is outside feature 025's Plan and does not indicate a gap in this feature's implementation.

**Status:** READY_TO_SHIP

## Retrospective

**Outcome:** SpekLess now has a durable post-completion reflection step that matches the feature goal: `spek:retro` exists as a dedicated, completion-gated skill, `spec.md` has a stable `## Retrospective` write target, and the surrounding docs, examples, installer guidance, and rendered agent packages all present retrospective as part of the shipped workflow rather than an implied future idea.

**What went well:**
- The task breakdown captured the real blast radius of adding a workflow step: template shape, architecture ownership, user docs, examples, rendered installs, and installer guidance all landed in one execution pass rather than surfacing as late follow-up drift.
- The verification/fix loop did its job. The first verify pass found the remaining top-level README and project-document inconsistencies, and the follow-up execute pass closed them cleanly before retrospective.
- The smoke test was well targeted for this kind of framework change: a scratch slash-command install and a scratch Codex install gave direct evidence that the new skill rendered correctly and that Codex packaging stayed BOM-free.

**What surprised us:**
- The easiest gaps to miss were not in the new skill itself, but in higher-level inventory text that still described the older workflow. The feature was functionally complete before the framework was documentationally complete.
- Adding a new workflow section created two synchronization surfaces at once: canonical source docs and checked-in rendered agent artifacts. Treating only one of those as "the real change" would have left the framework internally inconsistent.

**Principle candidates:**
- Keep workflow-section changes coupled to their inventory and example updates in the same feature - already covered by `## Documentation` and `## Sync Rule`.
