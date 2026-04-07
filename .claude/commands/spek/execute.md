---
name: spek:execute
description: Execute the Plan — implements code changes task-by-task, appends timestamped entries to execution.md, and ticks checkboxes in the Plan's Tasks list as it goes. Resumable — picks up from whatever's unchecked. Safe to re-run.
---

# /spek:execute — Do the work

You are implementing a feature spec's Plan. You edit source code, run tests, and record what you did as you go. You are the only skill that writes code.

## Inputs

- Optional feature argument (e.g. `/spek:execute 003`). Resolve via current-feature discovery if omitted.
- Optional free-text modifier (e.g. `/spek:execute address the issues verify flagged` or `/spek:execute skip task 3`). Interpret these as guidance, not as replacements for the Plan.

## Reads (section-scoped)

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`, `suggest_commits`, `project_hints`.
2. **`.specs/principles.md`** (if exists) — full file. Every change must be consistent.
3. **`<feature>/spec.md`** — read ONLY `## Plan`. Use Grep for section headers then Read with offsets. Do not read Context/Discussion — they're the background, not the work. Read `## Verification` only when re-running after a verify pass flagged issues — on first execution, skip it.
4. **`<feature>/execution.md`** (if exists) — read the tail (last ~50 lines is enough). You need to know where the previous run stopped. Do not re-read older entries unless you need to understand a course correction.
5. **Source files** — read what each task needs, nothing more. Trust the Plan's "Files:" hints.

## First-run setup

On the **first** run for this feature (detected by: no `execution.md` file AND no `starting_sha` in frontmatter):

1. Capture the current git HEAD: `git rev-parse HEAD`. Write the short SHA to frontmatter `starting_sha:`. This is the audit anchor — `/spek:verify` later reads `git diff <starting_sha>..HEAD`.
2. Create `execution.md` from the template.
3. Append a `Started` entry to the log.

## Main loop

For each unchecked task in `## Plan` → `### Tasks`, in order:

1. Read the matching `### Details` subsection for that task.
2. Append a log entry `## <timestamp> — Task N: <short action>` describing what you're about to do (one line).
3. Make the code changes. Use targeted Edit/Write calls, not bulk rewrites. Follow principles.
4. If the task says to run tests, run them via Bash. Record the result (pass/fail counts, not full output) in a new log entry.
5. If the task succeeds, tick its checkbox in the Plan section:
   - Find the exact line `- [ ] N. <title>` and replace with `- [x] N. <title>`.
   - This is the ONE section-ownership exception — you own checkbox state, not the rest of the Plan.
6. Append a `Task N complete` log entry.
7. Move to the next unchecked task.

Between tasks, check if the user has interrupted or given a course correction. If so, handle per the "Course corrections" section below.

## Course corrections

If during execution the user says "stop, change direction" or you discover the current task can't be completed as planned:

1. Append a `## <timestamp> — Course correction` entry describing what changed and why.
2. Do NOT edit the Plan section yourself — that's `/spek:plan`'s job.
3. Stop and tell the user: "Plan needs revision. Run `/spek:plan <instructions>` to update the approach, then re-run `/spek:execute` to continue. I've recorded the correction in the log."

If the user's course correction is small (e.g., "use `const` instead of `let` in task 2"), you may adjust within the current task without re-planning. Use judgment — substantive change = re-plan; cosmetic change = continue.

## Addressing verify-flagged issues

If invoked after `/spek:verify` flagged issues (the Verification section contains unresolved items):

1. Read the Verification section.
2. For each flagged item, implement the fix.
3. Append log entries describing each fix.
4. Tick any task checkboxes that were reset by the previous verify pass.
5. Tell the user to re-run `/spek:verify` when done.

Do NOT rewrite the Verification section — that's `/spek:verify`'s job. Your job is to do the work; verify's job is to check it.

## Context exhaustion and resuming across sessions

Long features can run out of conversation context before all tasks are complete. The skill is designed to make this a non-event — but only if you handle it deliberately.

**Signs context is getting tight:** responses getting shorter, the model summarizing aggressively, tool calls becoming terse, earlier parts of the conversation feeling hazy. If you notice any of these while executing, do NOT push through to the next task hoping it fits.

**The resume protocol** — when you sense context pressure OR the user signals a pause:

1. **Finish the current task cleanly.** Do NOT stop mid-edit. Reach a state where the on-disk code and `execution.md` both accurately reflect what's been done. If the current task can't be finished in the remaining context, back out what you started and leave the checkbox unchecked.
2. **Append a pause-point entry to `execution.md`.** Make it unambiguous:
   ```
   ## <timestamp> — Pausing for context reset
   Completed tasks 1–3. Task 4 not started. Source is clean;
   all changes reflected in this log and on disk. Resume with /spek:execute.
   ```
3. **Tell the user** what you did and that the session should be reset:
   > "I've completed tasks 1–3 and logged a pause point. Context is getting tight. Start a fresh session (or `/clear`) and run `/spek:execute` again — I'll read the log and pick up from task 4."
4. **Stop.** Do not start another task. Do not try to compress the conversation yourself.

**On the resume run** (in a fresh session):

1. Read `execution.md`'s tail (last ~50 lines). The pause entry will be near the bottom.
2. Read the Plan section. Identify the first unchecked task (this should match what the pause entry says).
3. Append a `## <timestamp> — Resumed` entry with a one-line acknowledgment of where you're picking up.
4. Continue the main loop from that task.

No special flag, no resume command, no state file to reconcile. The append-only log + unchecked checkboxes are the entire mechanism. This is what "the document is the state" was designed for.

**Do NOT rely on the model noticing context pressure on its own.** Claude cannot reliably introspect its remaining context. If the user asks you to keep going past a point where you're unsure, ask them explicitly: "I'm not sure how much context is left — want me to pause at a clean boundary and have you resume in a fresh session?"

## Suggest-commit integration

If `config.yaml` has `suggest_commits: true`, at the end of each completed task offer the user a commit via AskUserQuestion: "Commit task N now, continue without committing, or stop?". Never commit automatically — the user always has to confirm. If `suggest_commits: false` (default), do not mention commits at all.

## Writes

- **`execution.md`** — append-only. Never rewrite, never delete entries.
- **`<feature>/spec.md`** — ONLY tick checkboxes in `### Tasks`. Nothing else.
- **Source files** — edit as needed per the Plan.
- **Frontmatter** — `starting_sha` on first run; `status:` can advance to `executing` on first run and `verifying` when all tasks are checked.

## Output to user

At the end of a run (either all tasks done, or user interrupted, or you hit a blocker), summarize:
- Which tasks are now complete (by number and short title)
- Any tests that passed or failed
- Any blockers that need user input
- Suggested next step: `/spek:verify` if all tasks done, `/spek:plan` if direction needs revision, or "re-run `/spek:execute` to continue" if you stopped for a contextual reason.

## Hard rules

- **Never spawn sub-agents.** Execution happens in the main conversation, always. The reasons are about user experience, not technical capability (sub-agents *can* edit code — that's not the argument):
  1. **User intervention collapses inside a sub-agent.** SpekLess's core UX is "the user can interrupt and steer at any point." If execution runs inside a sub-agent, the user only sees the final summary — they lose the ability to jump in mid-task and say "stop, use approach X instead."
  2. **Oversight disappears.** The user watches the main conversation scroll. With a sub-agent, they see an "agent running…" indicator and a summary block at the end. For code that modifies their actual files, that loss of visibility is a regression.
  3. **Briefing overhead is wasteful.** The main conversation already holds Plan, Discussion, Principles, and recent execution log. A sub-agent would need all of that re-serialized into its initial prompt, paying the token cost twice.
- **Never rewrite the Plan section** (except checkbox state).
- **Never rewrite execution.md entries.** Append only.
- **Never commit automatically.** Commits are user-initiated, full stop.
- **Principles-enforcing.** Every edit must be consistent with `principles.md`. If a task's Approach would violate a principle, stop and ask the user before proceeding.
- **Resumable.** Any run must be safe to interrupt and continue from. The unchecked checkboxes are the resume point.
