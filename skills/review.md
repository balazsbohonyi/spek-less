---
name: spek:review
description: Review a feature plan before execution — reads Context, Discussion, Assumptions, Plan, principles, and project context; writes only the Review section. Advisory and safe to re-run.
---

# spek:review — Pressure-test the design before coding

You are reviewing a planned feature before execution starts. Your mindset is a senior engineer reading the design, not the implementation: pressure-test the proposed decomposition, dependencies, abstraction boundaries, and principle alignment before anyone writes code.

## Inputs

- Optional feature argument (e.g. `spek:review 003`). Resolve via current feature discovery (see `discuss.md`) if omitted.

## Reads (section-scoped)

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`.
2. **`.specs/principles.md`** (if it exists) — full file. Every principle is a checkable constraint.
3. **`.specs/project.md`** (if it exists) — full file. Problem, Scope, and constraints are the most important background.
4. **`<feature>/spec.md`** — read ONLY frontmatter + `## Context` + `## Discussion` + `## Assumptions` + `## Plan`. Use Grep to find section headers, then Read with offsets. Do not read `## Verification`; skip the existing `## Review` unless the user explicitly asks to compare against it.
5. **Source files** — none by default. Review is design-only. If you find yourself reading implementation files, stop and ask whether the user actually wanted `spek:verify`.

## Behavior

**Strict gate on plan quality.** `spek:review` is for pre-execution design review, not brainstorming. If `## Plan` is missing, still skeletal, or lacks a concrete task list plus matching Details subsections, stop and tell the user to run `{{CMD_PREFIX}}spek:plan` first. Do not write a fake review for incomplete material.

Review the design from these angles:

- **Architecture** — wrong abstraction level, unnecessary coupling, circular dependencies, layers wired together directly when indirection or separation is needed.
- **Decomposition** — promised behavior in Context that the task list does not actually cover; missing error handling, empty/loading states, cleanup paths, migrations, rollback, or boundary cases that are obviously part of the feature.
- **Principles** — any task Approach that conflicts with `principles.md`. Name the task, cite the principle, and explain the mismatch.
- **Scope** — over-scoping ("while we're here" work outside Context) and under-scoping (Context promises more than the Plan decomposes).
- **Simplicity** — whether a previously rejected alternative in Discussion now looks cleaner once the concrete file-level plan is visible.
- **Dependencies and risks** — hidden bets on third-party packages, internal APIs, undocumented data shapes, migrations, or deployment preconditions that are not captured in Assumptions.
- **Task ordering** — dependencies that are implicit, unnecessarily serialized work, or sequencing that would make execution harder than it needs to be.

Classify each finding as exactly one of:

- **`critical`** — execution should not start until this is addressed; the plan is materially incomplete, contradictory, or unsafe.
- **`warning`** — significant risk or likely rework; execution could proceed, but only with a conscious tradeoff.
- **`note`** — improvement, simplification, or advisory observation that does not block execution.

Findings must be concrete. Tie each one to a task number, assumption, Context promise, Discussion decision, or principle. Avoid generic statements like "consider edge cases" with no specifics.

Review remains advisory. You are not approving or rejecting the feature; you are surfacing risks clearly enough that the user can choose whether to revise the plan, revisit scope, or proceed anyway.

## Writes

Fully rewrite `## Review` in this structure:

```markdown
## Review

**Summary:** <1 short paragraph on whether the design looks ready for execution and why>

**Critical findings:**
- None.
or
- <finding tied to a task / section / principle>

**Warnings:**
- None.
or
- <finding>

**Notes:**
- None.
or
- <finding>

**Recommended next move:** `spek:plan` | `spek:discuss` | `spek:execute` — <one-line reason>
```

Pick the recommended next move this way:

- `spek:plan` when unresolved `critical` or `warning` findings require a concrete replan.
- `spek:discuss` when the issue is really scope, ambiguity, assumptions, or a decision that belongs back in discussion.
- `spek:execute` when the plan is solid enough to proceed and only notes remain.

Do not modify any other section. Do not touch `execution.md`. Do not edit source files.

## Output to user

- Short summary: counts of `critical`, `warning`, and `note` findings, plus the recommended next move.
- A single **AskUserQuestion** with three options:
  1. **"Revise the plan via `{{CMD_PREFIX}}spek:plan`"**
  2. **"Proceed to `{{CMD_PREFIX}}spek:execute` and accept the risk"**
  3. **"Revisit scope via `{{CMD_PREFIX}}spek:discuss`"**

Choose the recommended option based on the findings you just wrote into `## Review`. Even when the review is clean, still present the explicit choice so the user decides whether to act on the feedback or move on.

## Hard rules

- **Review owns `## Review` and nothing else.** Never rewrite Context, Discussion, Assumptions, Plan, Verification, or execution.md.
- **Read-only for implementation.** This is a design review, not code review. Do not modify source files and do not inspect them unless the user explicitly redirects the task.
- **Idempotent.** Re-running fully rewrites `## Review` from the current Context, Discussion, Assumptions, Plan, and principles.
- **Strict before lenient.** If the plan is too skeletal to review honestly, stop and send the user to `{{CMD_PREFIX}}spek:plan` instead of fabricating advice.
- **No sub-agents.** Review is an explicit checkpoint in the main conversation, not a hidden pipeline step.
- **Concrete findings only.** Every finding must point to a real task, promise, assumption, decision, or principle conflict.
