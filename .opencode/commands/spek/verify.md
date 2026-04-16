---
name: spek:verify
description: Goal-backward verification of a feature — reads the Plan, execution.md, and git diff, checks whether the goal was actually achieved. Strictly read-only for source code. Writes the Verification section. If issues are flagged, offers next moves via AskUserQuestion.
---

# spek:verify — Check the work with a fresh lens

You are verifying that a feature actually achieves its goal. Your mindset is **goal-backward**: start from what the Plan said would be done, then check whether it was. Do not rationalize execute's output. Do not assume the code is correct because execute ran without errors. Your job is to find gaps.

## Inputs

- Optional feature argument (e.g. `spek:verify 003`). Resolve via current-feature discovery if omitted.

## Reads (section-scoped)

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`.
2. **`.specs/principles.md`** (if exists) — full file. Every principle is a thing to check.
3. **`.specs/project.md`** (if exists) — only the Scope and Success Metrics sections. Use Grep + offset Read.
4. **`<feature>/spec.md`** — read `## Context` (for the goal), `## Assumptions` (if present, for what was taken as given), and `## Plan` (for what was promised). Skip `## Discussion` (not needed for verification).
5. **`<feature>/execution.md`** — full file. This is your primary narrative source.
6. **`git diff <starting_sha>..HEAD`** — the actual changes. Run this via Bash. This is your primary technical source.
7. **Source files** — only ones referenced in the diff or flagged as suspect. Never bulk-read.

If `starting_sha` is empty (feature was adopted via `spek:adopt`, which captures a retroactive snapshot), the diff is empty; in that case, verify by reading the files listed in each task's Details section and checking that the code matches what the Plan claims.

## Fresh-lens option (complex features)

For features with more than ~5 tasks or substantial diffs, delegate verification to a **general-purpose sub-agent** with a tight prompt:

```
You are doing a goal-backward verification pass. Do not assume the implementation
is correct. Read the following inputs and report: (a) which Plan tasks were
actually completed, (b) which were skipped or partially done, (c) any principle
violations, (d) any bugs, security issues, or missing edge cases you notice.

Plan: <paste Plan section>
Execution log: <paste execution.md>
Git diff: <paste diff or file list>
Principles: <paste principles.md>

Return a structured report: completed / partial / missing / issues.
```

The sub-agent's fresh conversation is the entire mechanism behind "fresh lens" — your main conversation has been watching execute do the work and will rationalize its choices. A fresh sub-agent has no such bias. Use this whenever the feature is non-trivial.

For simple features (1-3 tasks), verify inline in the main conversation.

## What to check

1. **Task completeness.** Every task in the Plan — was it actually done? Match each `### Details` entry against the diff. A ticked checkbox is not proof; the code is proof.
2. **Principle compliance.** For each principle in `principles.md`, is there a violation in the diff? Name the file and line if so.
3. **Goal achievement.** Re-read `## Context` in spec.md. Does the implementation achieve the stated goal? Does it respect the stated out-of-scope items?
4. **Test coverage.** If the Plan included tests, were they written? Do they actually exercise the new code path, or are they token placeholders?
5. **Obvious bugs.** Null/undefined handling at boundaries, off-by-one, missing error paths, resource leaks. Do not go on a fishing expedition — check the kinds of things that realistically slip past execute.
6. **Regression risk.** Did the diff touch anything outside the Plan's declared files? If so, is the touch justified?
7. **Assumption check.** For each `- [ ]` entry in `## Assumptions`: does the diff or the touched source files confirm the assumption held? Mark `[x]` directly in `spec.md`'s `## Assumptions` for confirmed. For assumptions that can't be verified from the diff (e.g., scale limits, third-party guarantees), append `<!-- unverifiable: <reason> -->` inline and leave the checkbox `[ ]` — do not tick silently.

## Writes

**Fully rewrite** the `## Verification` section. Structure:

```markdown
## Verification

**Task-by-task check:**
- Task 1 — <title>: ✓ / ⚠ / ✗ — <one-line evidence: file:line or brief reason>
- Task 2 — <title>: ✓ / ⚠ / ✗ — <one-line evidence>
...

**Principles check:**
- <principle name>: ✓ / ⚠ / ✗ — <evidence>
...

**Assumptions check:** *(omit section if `## Assumptions` is absent or has no checkbox entries — a comment-only section counts as empty)*
- <assumption text>: ✓ confirmed / ⚠ unverifiable — <one-line evidence or reason>
...

**Goal check:** <one paragraph: does the implementation achieve Context's stated goal? Any gaps against Success Metrics?>

**Issues found:**
<list of concrete issues, each with file:line references. If none, say "None.">

**Status:** READY_TO_SHIP | ISSUES_TO_FIX | INCOMPLETE
```

After writing the Verification section, if `## Assumptions` is present and has checkbox entries, tick confirmed assumptions directly in `spec.md`'s `## Assumptions` section: replace `- [ ]` with `- [x]` for each confirmed entry. For unverifiable assumptions, append `<!-- unverifiable: <reason> -->` on the same line and leave `[ ]`. This is the only write to a section not named `## Verification` — permitted by the checkbox-ticking exception in `principles.md`.

Update frontmatter `status:` to `done` if READY_TO_SHIP, otherwise leave as `verifying`.

## Follow-up UX (CRITICAL)

After writing the Verification section, check if any issues were flagged:

- **If status is READY_TO_SHIP:** output a short success message and stop.
- **If status is ISSUES_TO_FIX or INCOMPLETE:** use the **AskUserQuestion tool** with three options:
  1. **"Run `/spek:execute` now to fix the flagged issues"** (recommended)
  2. **"Revise the Plan first via `/spek:plan`"** (when the issues are structural)
  3. **"Stop — I'll handle it manually"**

Do NOT proceed to fix issues yourself. Do NOT modify source code under any circumstances. Verify is strictly advisory.

## Output to user

- Short summary: N tasks verified, M passed, K issues found, status = X.
- If issues exist, the AskUserQuestion follow-up above.
- If clean, congratulations and a nudge to commit if they haven't.

## Hard rules

- **Strictly read-only for source code.** You never write, edit, or delete source files. Full stop.
- **Section-scoped writes.** `## Verification` is your primary write target. The one exception: tick checkboxes in `## Assumptions` (permitted by the checkbox-ticking exception in `principles.md`). Never touch Context, Discussion, Plan, or execution.md.
- **Idempotent.** Re-running fully rewrites Verification based on current state.
- **Fresh lens.** For non-trivial features, delegate to a general-purpose sub-agent. Do not rationalize the main conversation's prior execution.
- **Goal-backward.** Start from Context's goal, not from execute's activity log. Activity is not achievement.
- **No follow-up execution.** If the user selects "fix now" in the follow-up AskUserQuestion, tell them to invoke `spek:execute` — do not chain into execution yourself from within the verify skill.
