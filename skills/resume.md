---
name: spek:resume
description: Pick up where you left off — shows the current feature's status, task progress, and last execution log entry, then suggests the right next command. Read-only. Use when returning after a break or context reset. More focused than spek:status — oriented toward "what do I do now?" rather than "give me an overview."
---

# spek:resume — Pick up where you left off

You are helping the user resume work after a break, a context reset, or switching back from another task. This skill is a lightweight, action-oriented read of the current feature state — it tells the user exactly where they are and what to do next, without requiring them to remember the workflow.

This is NOT `spek:status`. Status gives a broad overview of all features. Resume is narrower: it focuses on the single current feature and frames everything around "what should I do next?"

## Inputs

- Optional feature argument (e.g. `spek:resume 003`). Resolve via current-feature discovery if omitted.

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`.
2. **`.specs/principles.md`** (if exists) — full file.
3. **All `.specs/NNN_*/spec.md` and `.specs/NNN.M_*/spec.md`** — frontmatter only (via Grep for `^---` boundaries), to resolve the current feature.
4. **`<feature>/spec.md`** — frontmatter (`id`, `title`, `status`) and `### Tasks` checkbox lines only.
5. **`<feature>/execution.md`** (if exists) — last ~20 lines only.

## Current feature discovery

Same order as all workflow skills:
1. Explicit argument: `spek:resume 003` or `spek:resume 016.1` → `.specs/<id>_*/` (the supplied ID is used as-is as the folder prefix; no special-casing needed for the `NNN.M` form).
2. Git branch mapping (e.g. `feat/003-*` → `.specs/003_*/`, `feat/016.1-*` → `.specs/016.1_*/`).
3. Most recently modified `.specs/NNN_*/` or `.specs/NNN.M_*/` directory.
4. If none resolve, list available features and ask the user which one.

## Behavior

1. Resolve the current feature.
2. Read frontmatter, count checked (`N. [x]`) vs total tasks, and read the execution log tail.
3. Display a concise resume summary:

```
Resuming 003: Add dark mode toggle
Status: executing  (2 / 4 tasks done)

  1. [x] Create theme state module
  2. [x] Build ThemeSelect component
  3. [ ] Apply theme on app load
  4. [ ] Write regression tests

Last log entry:
  ## 2026-04-05 09:40 — Task 2 complete

Next: {{CMD_PREFIX}}spek:execute to continue from task 3.
```

4. Suggest the right next command based on `status`:

| Status | Suggested next step |
|---|---|
| `created` | `{{CMD_PREFIX}}spek:discuss` to explore the feature |
| `discussing` | `{{CMD_PREFIX}}spek:discuss` to continue, or `{{CMD_PREFIX}}spek:plan` if direction is clear |
| `planning` | `{{CMD_PREFIX}}spek:execute` to start implementation |
| `executing` | `{{CMD_PREFIX}}spek:execute` to continue (picks up from first unchecked task) |
| `verifying` | `{{CMD_PREFIX}}spek:commit` if Verification is clean, `{{CMD_PREFIX}}spek:execute` to fix issues |
| `decomposed` | See sibling routing below |
| `done` | Feature is complete — `{{CMD_PREFIX}}spek:new` to start another |

**Decomposed feature routing.** When the resolved feature has `status: decomposed`, glob `<specs_root>/<parent_id>.[0-9]*_*/spec.md`, read frontmatter and checkbox lines for each sibling, and display them in order:

```
Resuming 016: Improve plan.md decomposition  (decomposed)

  ↳ 016.1  Auth sessions     done      4 / 4 ✓
  ↳ 016.2  Token refresh     executing 1 / 3   ← next
  ↳ 016.3  Audit logging     planning  0 / 5

Next: {{CMD_PREFIX}}spek:execute 016.2 to continue from task 2.
```

Mark the first sibling that is not `done` with `← next`. If all siblings are `done`, suggest setting the parent to `done` as well: "All siblings complete — update 016's status to `done`."

5. If no features exist yet, tell the user to run `spek:kickoff` (greenfield) or `spek:new` (new feature) to get started.

## Writes

None. This skill is strictly read-only.

## Output to user

The resume summary above, plus a single suggested next command. Keep it short — the user wants to get back to work, not read an essay.

## Hard rules

- **Strictly read-only.** Never write to any file. Never modify frontmatter, checkboxes, or execution.md.
- **No sub-agents.** All reads are lightweight (frontmatter + checkbox lines + log tail).
- **Section-scoped reads.** Frontmatter, checkbox lines, and execution.md tail only — never read Context, Discussion, Details, or Verification.
- **No interaction beyond the summary.** Display and stop. If the feature cannot be resolved unambiguously, list options and ask once — then stop.
