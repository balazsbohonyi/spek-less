---
name: spek:quick
description: Execute a quick task with SpekLess guarantees and full traceability — describe in one sentence, get a spec, execution log, and verified result. Skip discuss/plan overhead for small tasks.
---

# /spek:quick — One-shot task execution

You are the fast path for small, self-contained tasks that don't warrant the full discuss → plan → execute → verify cycle. You create a minimal spec, execute inline, and leave a complete audit trail. Use when the task fits in one sentence and the approach is obvious.

## Inputs

- **Required:** a one-sentence task description (e.g., `/spek:quick "Add --verbose flag to install.js"`).
- If no argument is provided, ask the user for one sentence describing the task before proceeding. Stop until you have it.

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml`; per-project wins) — `specs_root`, `suggest_commits`, `project_hints`. If neither exists, tell the user SpekLess is not installed and point them at `node install.js`. Stop.
2. **`.specs/principles.md`** (if exists) — full file. Every change must be consistent.
3. **Existing spec numbering** — Glob `<specs_root>/[0-9][0-9][0-9]_*/spec.md`. Parse the 3-digit prefix from each path. Next number = max + 1, zero-padded to 3 digits.
4. **Source files** — read only what each task needs, guided by the task description.

## Behavior

### 1. Create the spec

1. Derive a URL-safe slug from the description: lowercase, replace spaces and punctuation with hyphens, strip leading/trailing hyphens, max 40 chars.
2. Create folder `<specs_root>/NNN_<slug>/`.
3. Write `<specs_root>/NNN_<slug>/spec.md` with this exact structure (inline, no template substitution needed):

   ```
   ---
   id: "NNN"
   title: <description>
   type: quick
   status: executing
   part_of: <project.md name if present, else omit>
   starting_sha: <git rev-parse HEAD>
   created: <today YYYY-MM-DD>
   tags: []
   ---

   # <description>

   ## Context

   <One paragraph: what this task does and why. Derived from the description and project_hints.>

   ## Plan

   ### Tasks

   1. [ ] <task 1 title>
   2. [ ] <task 2 title>
   3. [ ] <task 3 title — omit if fewer tasks needed>

   ### Details

   #### 1. <task 1 title>

   **Files:** <file(s) to edit>

   **Approach:** <one or two sentences>

   #### 2. <task 2 title>

   **Files:** <file(s) to edit>

   **Approach:** <one or two sentences>

   ## Verification

   <!--
   Written by /spek:verify. Fully rewritten on re-run.
   -->
   ```

   Key points:
   - **No `## Discussion`** and **no `## Assumptions`** sections — quick specs skip them.
   - `type: quick` distinguishes this from a standard spec (`type` absent = standard).
   - `status: executing` — quick specs enter the lifecycle here, skipping created/discussing/planning.
   - `starting_sha` is captured now, not deferred to `/spek:execute`.
   - Plan tasks must be **file-level, checkable steps** — not a restatement of the description. Generate 1–3 tasks. If the task is trivially one edit, one task is fine.

4. Create `<specs_root>/NNN_<slug>/execution.md` from the execution template structure:

   ```
   # Execution Log — <description>

   <!-- ... standard template comment ... -->

   #### <timestamp> — Started
   Quick task. <description>. Executing inline.
   ```

### 2. Execute inline

Treat the auto-generated Plan as authoritative and execute it task-by-task, exactly as `/spek:execute` would:

1. For each unchecked task, read the matching Details subsection.
2. Append a log entry `#### <timestamp> — Task N: <short action>`.
3. Make the code changes using targeted Edit/Write calls.
4. Tick the checkbox in spec.md: replace `N. [ ]` with `N. [x]`.
5. Append `Task N complete` log entry.
6. Move to the next task.

If any task can't be completed as planned, stop and tell the user: "Task N blocked — <reason>. The spec and log are at `<path>`. Run `/spek:plan <instructions>` to revise, then `/spek:execute` to continue."

### 3. Finalize

When all tasks are checked:

1. Set `status: verifying` in spec.md frontmatter.
2. Append a final log entry summarizing what was done.
3. Tell the user what was built and suggest `/spek:verify NNN` to confirm correctness.

## Writes

- **`<specs_root>/NNN_<slug>/spec.md`** — created inline (no template file needed)
- **`<specs_root>/NNN_<slug>/execution.md`** — created and appended inline
- **Source files** — edited as needed per the auto-generated Plan
- **spec.md frontmatter** — `starting_sha`, `status` advances from `executing` to `verifying`
- **spec.md Plan checkboxes** — ticked as tasks complete

## Output to user

At the end, summarize:
- Spec created: `NNN_<slug>/spec.md`
- Tasks completed (by number and title)
- Any issues or blockers
- Next step: `/spek:verify NNN` to confirm, or `/spek:commit NNN` if satisfied

## Hard rules

- **Never spawn sub-agents.** Everything runs in the main conversation.
- **Task description is required.** Do not proceed without it.
- **Plan tasks must be concrete and file-level.** "Update README.md to add X under section Y" is good. "Improve docs" is not.
- **1–3 tasks only.** If the task requires more than 3 steps, it's not a quick task — tell the user to run `/spek:new` → `/spek:plan` → `/spek:execute` instead.
- **No Discussion, no Assumptions sections.** Quick specs are intentionally stripped. If the user needs to explore trade-offs, use `/spek:discuss` instead.
- **Principles-enforcing.** Read `principles.md` before making edits. If a change would violate a principle, stop and tell the user.
- **Idempotent spec creation.** If the derived slug already exists, append `-2` to the slug. Never overwrite an existing spec.
- **Append-only log.** Never rewrite `execution.md` entries.
- **No automatic commits.** If `suggest_commits: true`, offer a commit via AskUserQuestion after all tasks complete. Never commit without explicit user confirmation.
