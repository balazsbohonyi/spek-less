---
name: spek:resume
description: Pick up where you left off — shows the current feature's status, task progress, and last execution log entry, then suggests the right next command. Read-only. Use when returning after a break or context reset. More focused than /spek:status — oriented toward "what do I do now?" rather than "give me an overview."
---

# /spek:resume — Pick up where you left off

You are helping the user resume work after a break, a context reset, or switching back from another task. This skill is a lightweight, action-oriented read of the current feature state — it tells the user exactly where they are and what to do next, without requiring them to remember the workflow.

This is NOT `/spek:status`. Status gives a broad overview of all features. Resume is narrower: it focuses on the single current feature and frames everything around "what should I do next?"

## Inputs

- Optional feature argument (e.g. `/spek:resume 003`). Resolve via current-feature discovery if omitted.

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`.
2. **All `.specs/NNN_*/spec.md`** — frontmatter only (via Grep for `^---` boundaries), to resolve the current feature.
3. **`<feature>/spec.md`** — frontmatter (`id`, `title`, `status`) and `### Tasks` checkbox lines only.
4. **`<feature>/execution.md`** (if exists) — last ~10 lines only.

## Current feature discovery

Same order as all workflow skills:
1. Explicit argument → `.specs/NNN_*/`
2. Git branch mapping (e.g. `feat/003-*` → `.specs/003_*/`)
3. Most recently modified `.specs/NNN_*/` directory
4. If none resolve, list available features and ask the user which one

## Behavior

1. Resolve the current feature.
2. Read frontmatter, count checked (`- [x]`) vs total tasks, and read the execution log tail.
3. Display a concise resume summary:

```
Resuming 003: Add dark mode toggle
Status: executing  (2 / 4 tasks done)

  [x] 1. Create theme state module
  [x] 2. Build ThemeSelect component
  [ ] 3. Apply theme on app load
  [ ] 4. Write regression tests

Last log entry:
  ## 2026-04-05 09:40 — Task 2 complete

Next: /spek:execute to continue from task 3.
```

4. Suggest the right next command based on `status`:

| Status | Suggested next step |
|---|---|
| `created` | `/spek:discuss` to explore the feature |
| `discussing` | `/spek:discuss` to continue, or `/spek:plan` if direction is clear |
| `planning` | `/spek:execute` to start implementation |
| `executing` | `/spek:execute` to continue (picks up from first unchecked task) |
| `verifying` | `/spek:commit` if Verification is clean, `/spek:execute` to fix issues |
| `done` | Feature is complete — `/spek:new` to start another |

5. If no features exist yet, tell the user to run `/spek:kickoff` (greenfield) or `/spek:new` (new feature) to get started.

## Writes

None. This skill is strictly read-only.

## Output to user

The resume summary above, plus a single suggested next command. Keep it short — the user wants to get back to work, not read an essay.

## Hard rules

- **Strictly read-only.** Never write to any file. Never modify frontmatter, checkboxes, or execution.md.
- **No sub-agents.** All reads are lightweight (frontmatter + checkbox lines + log tail).
- **Section-scoped reads.** Frontmatter, checkbox lines, and execution.md tail only — never read Context, Discussion, Details, or Verification.
- **No interaction beyond the summary.** Display and stop. If the feature cannot be resolved unambiguously, list options and ask once — then stop.
