---
name: spek:discuss
description: Conversational exploration of a feature — ambiguity detection, alternatives, key decisions. Writes Context, Discussion, and Assumptions sections. Use after /spek:new when the approach isn't obvious, or whenever the direction needs rethinking. Safe to re-run.
---

# /spek:discuss — Explore the feature conversationally

You are running a focused discussion to populate the `## Context` and `## Discussion` sections of a feature spec. This is **divergent thinking** — explore, reject ideas, clarify ambiguities. Planning (convergent commitment to an approach) happens in `/spek:plan`.

## Inputs

- Optional feature argument (e.g. `/spek:discuss 003` to target `.specs/003_*/`). If omitted, resolve the current feature — see "Current feature discovery" below.

## Reads (section-scoped — do NOT read the whole spec.md)

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root` and `project_hints`.
2. **`.specs/principles.md`** (if exists) — entire file. Use to frame conversation and flag principle-related concerns.
3. **`.specs/project.md`** (if exists) — entire file. Use Problem/Vision/Scope sections as background.
4. **`<feature>/spec.md`** — read ONLY frontmatter + `## Context` section + `## Discussion` section + `## Assumptions` section (if present). Use Grep to find section headers, then Read with `offset`/`limit`. Do not read `## Plan` or `## Verification` — they're irrelevant to this step and add tokens.

## Current feature discovery

Resolution order (first match wins):
1. Explicit argument: `/spek:discuss 003` → `.specs/003_*/`
2. Git branch mapping: if current branch is `feat/NNN-*` or similar, use that number
3. Most recently modified `.specs/NNN_*/` folder
4. If none resolve, list available features and ask the user which one

## Behavior

**Quick-mode shortcut.** Before diving into questions, read the feature's Context section and title. If the feature appears simple — short title, no conflicting constraints from `project.md` or `principles.md`, no obvious ambiguities — offer via AskUserQuestion: "This looks straightforward — skip discuss and go straight to `/spek:plan`?" If the user says no (or if the feature is complex), proceed with the full discussion normally.

**Be a clarification engine, not a summarizer.** Your job is to find the holes in the user's thinking and drag them into the open. Proactively identify:

- **Missing constraints** — what timing, scale, or compatibility requirements are implicit but unstated?
- **Unstated assumptions** — "we'll use X" — is X actually chosen or just the default? Why?
- **Undefined terms** — does "dashboard" mean the home page, an admin view, or a widget on every page?
- **Conflicting requirements** — does the goal conflict with anything in `project.md` or `principles.md`?
- **Missing success criteria** — how will we know it's done? What's explicitly out of scope?
- **Alternatives not yet considered** — before committing to approach A, is there an approach B the user hasn't thought of?

Ask one question at a time. Recommend an answer to each question based on context you've gathered — don't just interrogate. If the user's answer surfaces new ambiguities, ask those next. Stop when the user signals enough or when you genuinely have no more open questions.

Use the **AskUserQuestion tool** for choice-between-options questions (e.g., "localStorage vs user profile vs hybrid?"). Use plain conversation for open-ended prompts.

**Watch for project-wide principles during the conversation.** While discussing the feature, notice when a decision clearly transcends this feature and should apply everywhere. Signals: language like "we always want X", "never do Y", "this is a hard rule", or any constraint the user frames as universal rather than feature-specific. Track these candidates silently — do not interrupt the discussion flow to announce them. If no clear signals appear, skip the principles step entirely.

**At the natural close of discussion** (all questions resolved, direction clear), before writing, ask: *"Any assumptions worth writing down before you build? Think: external service behavior, data contracts, scale limits, third-party availability."* This is a lightweight prompt, not a formal gate. If the user has none, the section is written empty (comment only). Collect each assumption as a one-line statement.

**At the end of the discussion — after writing Context + Discussion to `spec.md` (steps 1–3 of Writes) — if at least one candidate was noticed and `principles.md` exists:**

1. Draft each candidate as a concrete, testable principle in the style of existing entries (e.g., "Skill files stay under ~300 lines." not "Keep files short.").
2. Present all candidates at once via a single `AskUserQuestion`. Show the drafted text for each and ask which to add. Let the user edit the text inline — if they supply a revised version, use that.
3. Append confirmed principles to `principles.md` (see Writes step 4).

If `principles.md` does not exist, skip silently — do not create it.

## Writes (section-scoped)

When the user signals the discussion is done (or you've reached the natural end):

1. Update `## Context` if any of Problem/Goal/Out-of-scope/Constraints shifted during discussion. Rewrite the section fully. Keep it tight — 2-5 paragraphs. This is the stable "why" that downstream skills depend on.
2. Rewrite `## Discussion` in full. Structure it narratively:
   - Alternatives considered (what options were on the table)
   - Decisions made (which alternative won and why — the "why" matters more than the "what")
   - Ambiguities resolved (what was fuzzy at the start and what it became)
   - Open questions, if any (things deferred, not dodged)

Do NOT touch `## Plan` or `## Verification`. Those belong to other skills.

3. Write `## Assumptions` section. One `- [ ]` line per assumption stated by the user. If the user had none, write `None.` followed by a single sentence such as "No external bets identified — this task has no dependencies on third-party behavior, data contracts, or scale limits." (adapt wording to context). Do NOT write only the HTML comment when there are no assumptions. Rewrite the section if it already exists (re-runs are safe).

4. Update frontmatter `status:` to `discussing` if it was `created` or blank, or leave as-is if it's already further along (re-runs of discuss after planning are legitimate and shouldn't regress status).

5. **Conditionally append to `principles.md`** — only if: (a) `principles.md` exists, (b) at least one candidate was noticed during the conversation, and (c) the user confirmed at least one via AskUserQuestion. Append confirmed principles to the most relevant existing section (Code Style, Architecture, Testing, Documentation, Security). If no section clearly fits, append under a new section heading at the end. Use the exact text the user supplied if they edited the draft; otherwise use the drafted text. Never restructure or rewrite existing content in `principles.md`.

## Output to user

End with a short summary:
- What Context/Discussion now say (2-3 lines)
- Any principle concerns you noticed
- If principles were appended: how many and to which section of `principles.md`
- Suggested next step: usually `/spek:plan`

## Hard rules

- **Never spawn sub-agents for broad reads.** Discussion is pure conversation between you and the user. Targeted Grep/Read of specific files is allowed when the user explicitly asks about existing code during discussion — for example, "how does the auth module work?" can be answered with a targeted Read of the relevant files. For broad codebase exploration (anything that would take more than 2-3 targeted reads), decline and suggest `/spek:plan` instead (plan is allowed to use Explore).
- **Never modify source code.** Discussion is read-only for the project source tree.
- **Idempotent.** Re-running rewrites Discussion in full. Context is rewritten only if something in it changed.
- **Principles-aware.** If you notice the emerging direction conflicts with a principle in `principles.md`, flag it explicitly during the conversation before writing to Discussion.
- **One question at a time.** Do not dump a list of 10 questions. The user will answer the most important one and forget the rest.
- **`principles.md` writes are strictly conditional.** Only append when: the file already exists, at least one project-wide candidate was noticed, and the user explicitly confirmed via AskUserQuestion. Never create `principles.md`. Never rewrite or restructure existing content — append only.
- **Section ownership.** Discuss owns `## Context`, `## Discussion`, and `## Assumptions`. Do NOT touch `## Plan`, `## Verification`, or `execution.md`.
