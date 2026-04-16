---
name: spek:plan
description: Write or rewrite the Plan section of a feature spec — task breakdown with checkboxes plus per-task details. Reads execution.md if present (for mid-execute replanning). Safe to re-run. May spawn an Explore sub-agent for unfamiliar codebases.
---

# spek:plan — Commit to an approach

You are writing the `## Plan` section of a feature spec. This is **convergent thinking** — pick one approach and lay out the concrete work. If the user still has open questions about direction, send them back to `spek:discuss`.

## Inputs

- Optional feature argument (e.g. `spek:plan 003`). Resolve via "Current feature discovery" (see `discuss.md`) if omitted.
- Optional free-text modifier from the invocation (e.g. `spek:plan use Postgres instead`). Incorporate into the new plan.

## Reads (section-scoped)

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`, `subagent_threshold`.
2. **`.specs/principles.md`** (if exists) — full file. Every task in the Plan must be consistent with these.
3. **`.specs/project.md`** (if exists) — full file. Scope and constraints sections matter most.
4. **`<feature>/spec.md`** — read ONLY frontmatter + `## Context` + `## Discussion`. Use Grep for headers then Read with offsets. Do NOT read the existing `## Plan` when the user is starting fresh; DO read it if the user's invocation implies tweaking (e.g. "add a task for X", "swap Postgres for SQLite").
5. **`<feature>/execution.md`** — **if it exists**, read it (tail 50 lines is usually enough). This is critical when replanning mid-execute: the new plan must acknowledge completed work and not propose redoing it.
6. **Source code** — read files the plan will touch, enough to make concrete file-level decisions. **Use the `subagent_threshold` rule:** if understanding the area would take more than that many targeted reads/greps, delegate to an **Explore sub-agent** with a focused prompt like "Map the auth module: file layout, main abstractions, entry points, where session state lives." The sub-agent returns a distilled summary; you never read the raw source into your context.

## Behavior

Produce a task breakdown where each task is:

- **Atomic** — can be completed in one sitting, one logical change.
- **Ordered** — sequential dependencies explicit; independent tasks can be in any order.
- **Scoped** — names the files it touches (or a clear "create new file" marker).
- **Testable** — `spek:verify` must be able to tell whether it was done correctly.

Rule of thumb: 3–8 tasks for a typical feature. Fewer than 3 means the feature is too small to need a plan; go straight to `spek:execute`. More than 8 usually means the feature should be decomposed into sibling specs via `part_of:`.

**Decomposition offer.** Always draft the **full plan first** — all tasks + Details — before raising decomposition. Then, if the task count exceeds 8, use AskUserQuestion with the proposed sibling groupings spelled out (e.g., "Tasks 1–3 → 016.1 Auth sessions; Tasks 4–6 → 016.2 Token refresh") and two options:

1. **"Create sibling specs"** — proceed with decomposition as described below.
2. **"Keep as a single plan"** — write the drafted plan as-is into `## Plan` and stop.

**If the user chooses decomposition:**

a. Glob `<specs_root>/<parent_id>.[0-9]*_*/` to determine the highest existing sibling number; the next sibling starts at N=1 (or highest+1 if siblings exist).

b. For each proposed sibling group, create `<specs_root>/<parent_id>.<N>_<slug>/spec.md` with:
   - Frontmatter: `id: <parent_id>.<N>`, `status: planning`, `part_of: <parent_id>`, plus `title:`, `created:`, `tags:` inherited/derived.
   - `## Context` — derived from parent Context, narrowed to this sibling's scope.
   - `## Discussion` — subset of parent Discussion relevant to this sibling (may be brief).
   - `## Assumptions` — subset of parent Assumptions relevant to this sibling.
   - `## Plan` — containing only this sibling's tasks (task numbers restart from 1).

c. Rewrite the parent's `## Plan` to a sibling index:
   ```markdown
   ## Plan

   > Decomposed into sibling specs. Work each sibling through the full workflow independently.

   | Sibling | Title | Status |
   |---------|-------|--------|
   | [016.1](../016.1_slug/spec.md) | Title | planning |
   | [016.2](../016.2_slug/spec.md) | Title | planning |
   ```

d. Set parent frontmatter `status: decomposed`.

**Self-validation (optional but recommended for non-trivial features):** after drafting the plan, you may delegate a review pass to a **Plan sub-agent** with the draft plan, Context, Discussion, and principles as inputs. It critiques — you then revise before writing. Skip for simple features.

## Mid-execute replanning (IMPORTANT)

If `execution.md` exists and contains completed work:

1. Read the execution log (tail is fine).
2. Determine which tasks from the **existing** Plan are already done.
3. Write the new Plan so that:
   - Completed tasks remain in the task list with `[x]` checkboxes preserved
   - Changed tasks are re-evaluated — if the change is substantive, reset the checkbox to `[ ]`; if the title and approach are unchanged, keep the checkbox as-is
   - New tasks added by the replan get fresh `[ ]` boxes (format: `N. [ ] Title`)
4. Your rewrite must make sense read linearly alongside the execution log — a reader should see "these three tasks were done under the old plan, then direction changed, here are the remaining tasks."

## Writes

Fully rewrite `## Plan` in this structure:

```markdown
## Plan

### Tasks

1. [ ] Short task title
2. [ ] Short task title
3. [ ] Short task title

### Details

#### 1. Short task title

**Files:** `path/to/file.ext`, `path/to/other.ext`

**Approach:** 2-4 sentences. Decision-level, not line-by-line. Mention the key abstraction choice or data shape. Flag any principles that apply.

#### 2. Short task title
...
```

Do NOT touch any other section. Do NOT touch `execution.md`. Do NOT modify source files.

**Decomposition-path exception:** when the user chooses decomposition, `plan.md` also creates sibling spec files (`<specs_root>/<parent_id>.<N>_<slug>/spec.md`) and updates the parent's frontmatter `status:` to `decomposed`. This is the only case where this skill writes outside `## Plan`.

Update frontmatter `status:` to `planning` (or keep `executing`/`verifying` if the plan is being revised mid-flight).

## Output to user

End with:
- Short summary: "N tasks, key approach decisions were X, Y."
- Any principle concerns or risks noticed while planning.
- Suggested next step: `/spek:execute` (or `/spek:discuss` if planning surfaced fresh ambiguities).

## Hard rules

- **Section-scoped writes.** Only `## Plan` is yours. Never touch Context, Discussion, Verification, or execution.md. The one exception: on decomposition, you also create sibling spec files and update the parent's `status:` frontmatter — this is the only time `plan.md` writes outside `## Plan`.
- **Idempotent.** Re-running fully rewrites Plan. Checkbox state preservation on unchanged tasks is the one subtlety — respect it.
- **Principles-enforcing.** If the most obvious plan would violate a principle in `principles.md`, either pick a different approach or flag the conflict prominently in the task details so the user can override consciously.
- **Explore sub-agent for unfamiliar code.** Follow the `subagent_threshold` rule. Burning main-context tokens on bulk source reads is exactly the failure mode SpekLess exists to avoid.
- **Never execute.** Planning does not edit code. If you catch yourself about to write a code change, stop — that's `spek:execute`'s job.
