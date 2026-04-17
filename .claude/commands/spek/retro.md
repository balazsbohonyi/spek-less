---
name: spek:retro
description: Post-completion retrospective for a feature — reads the spec, execution log, and principles, writes the Retrospective section, and optionally appends confirmed project-wide lessons to principles.md.
---

# spek:retro — Capture lessons after the work is done

You are writing the post-completion retrospective for a feature. Your job is to turn the finished work into durable lessons: what changed, what surprised us, what went well, and which lessons should become project principles. This is a reflection step, not a planning or verification pass.

## Inputs

- Optional feature argument (e.g. `spek:retro 003`). Resolve via current-feature discovery if omitted.

## Reads (section-scoped)

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`.
2. **`.specs/principles.md`** (if exists) — full file. Existing principles shape which lessons are already covered and where confirmed additions belong.
3. **`<feature>/spec.md`** — read frontmatter, `## Context`, `## Plan`, `## Verification`, and `## Retrospective`. Skip `## Discussion` unless the execution log is absent and you need one decision-level sentence of context.
4. **`<feature>/execution.md`** (if exists) — full file. This is your primary narrative source for what changed during implementation.
5. **Source files** — do not read them unless the Verification section or execution log names a concrete file-level issue that materially changes the retrospective.

## Gating

This skill runs only on completed work.

- Proceed if frontmatter `status: done`.
- Also proceed if frontmatter is not `done` but the current `## Verification` section ends with `**Status:** READY_TO_SHIP`.
- Otherwise stop and tell the user to finish verification first via `/spek:verify`.

If `execution.md` is missing (for example, a retroactively documented feature), continue using `## Plan` and `## Verification` as the narrative source. Do not fabricate execution history that was never recorded.

## What to extract

1. **Outcome.** What changed relative to the feature's goal in `## Context`?
2. **Execution story.** What actually happened while doing the work — smooth path, course correction, hidden dependency, or notable tradeoff?
3. **Reusable lessons.** Which takeaways are specific to this feature, and which are general enough to become project principles?
4. **Principles gap check.** Compare the lessons against `principles.md`. If a lesson is already covered, cite it in the retrospective rather than proposing a duplicate.

Only propose **project-wide** principle candidates. Do not elevate one-off implementation details into principles.

## Principle-candidate offer

After drafting the retrospective, decide whether any lessons should be proposed as additions to `principles.md`.

- If `principles.md` does not exist, skip silently. Do not create it.
- If no project-wide candidates emerged, skip silently.
- If candidates exist and `principles.md` exists, present them all at once via a single **AskUserQuestion**. Show the drafted text for each candidate and ask which to append. Let the user edit the text inline — if they supply revised wording, use that exact wording.

## Writes

1. **Fully rewrite** the `## Retrospective` section in this shape:

```markdown
## Retrospective

**Outcome:** <one short paragraph tying the delivered work back to Context>

**What went well:**
- <concrete success>
- <concrete success>  # omit section if nothing meaningful fits

**What surprised us:**
- <unexpected detail, course correction, or hidden dependency>
- <unexpected detail>  # omit section if nothing meaningful fits

**Principle candidates:**
- <candidate principle text> — proposed / already covered by <section> / none
...  # write `None.` if no candidates emerged
```

Keep it concise and evidence-backed. Prefer specifics from `execution.md` or `## Verification` over vague process language.

2. **Conditionally append to `principles.md`** — only if:
   - the file already exists,
   - at least one project-wide candidate was drafted, and
   - the user explicitly confirmed it via AskUserQuestion.

Append confirmed principles to the most relevant existing section (Code Style, Architecture, Testing, Documentation, Sync Rule, Command References, Security). If no section clearly fits, append under a new section heading at the end. Never rewrite or restructure existing content in `principles.md`.

Do not change feature status. `spek:retro` is outside the lifecycle and owns only `## Retrospective` in `spec.md`.

## Output to user

- Short summary of the retrospective written: feature, outcome, and whether any principle candidates were noticed.
- If principles were appended: how many and to which section(s) of `principles.md`.
- Suggested next step: commit via `/spek:commit`, or start the next feature via `/spek:new`.

## Hard rules

- **Read-only for source code.** Never modify implementation files. Full stop.
- **Section-scoped writes.** `## Retrospective` is your primary write target. The only additional write allowed is appending user-confirmed entries to `principles.md`.
- **Idempotent.** Re-running fully rewrites `## Retrospective` from current inputs and may append only newly confirmed principles.
- **Completion-gated.** If the feature is not done or cleanly verified, stop instead of writing a premature retrospective.
- **No fabricated history.** If the execution log is thin or absent, say less. Do not invent course corrections, surprises, or rationale.
- **No duplicate principles.** If a lesson is already covered by `principles.md`, mention that in the retrospective instead of appending a near-duplicate rule.
