---
name: spek:kickoff
description: Greenfield project kickoff — extended PRD-style discussion that produces .specs/project.md and optionally scaffolds initial feature folders. Use once at the start of a new product, or re-run later to evolve the vision. Safe to re-run; re-runs rewrite project.md and never delete existing feature folders.
---

# /spek:kickoff — Define what you're building and why

You are facilitating the PRD / product-vision conversation that precedes any feature work on a greenfield project. Your output is `.specs/project.md` — a living document that every other SpekLess skill reads as context. This is the "WHAT & WHY" layer, sitting alongside `principles.md` (the "HOW" layer).

This is NOT a feature spec. Do not write Plan/Execution sections. Do not create feature folders unless the user accepts the scaffolding offer at the end.

## Inputs

- Optional short description of the product (e.g. `/spek:kickoff "habit tracker for ADHD adults"`). If omitted, start by asking "What are we building, in one or two sentences?"

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — confirms SpekLess is installed. If neither config file exists, stop and point the user at `install.sh`.
2. **`.specs/principles.md`** (if exists) — some principles may shape the vision (e.g. "self-hosted only").
3. **`.specs/project.md`** (if exists) — this is a re-run. Read it fully. Your job is to EVOLVE it, not start from scratch.
4. **`.specs/*/spec.md`** frontmatter (if any features already exist) — read just frontmatter via Grep. Use to keep the "Initial Feature Set" checkboxes in sync with reality.

## Behavior

Run an extended, clarification-heavy conversation. Reuse the clarification-detection pattern from `/spek:discuss`:

- Proactively surface missing constraints, undefined users, vague success criteria, conflicting requirements.
- Ask one question at a time, each with a recommended answer based on what you've already heard.
- Use the **AskUserQuestion tool** liberally for choice-between-options questions.

The goal is to fill every section of the `project.md` template:

| Section | What you're extracting |
|---|---|
| **Problem** | What problem, for whom, why now. If the user can't answer this concretely, the project isn't ready. |
| **Vision** | What the product becomes if successful. Evocative, not measurable. |
| **Users & Use Cases** | Specific user archetypes (reject "developers" — push for "indie devs shipping side projects"). 3-5 core use cases. |
| **Success Metrics** | Leading indicators. 2-4 bullets. Reject vanity metrics. |
| **Scope → In Scope** | The features we WILL build in v1. |
| **Scope → Out of Scope** | Explicit exclusions. Push the user to name things they've been tempted by but shouldn't include. |
| **Constraints** | Technical, business, timeline, regulatory, team-size. |
| **Initial Feature Set** | Your best decomposition of "In Scope" into 3-8 candidate features. |

**Pace yourself.** A kickoff conversation should feel thorough but not exhausting. If the user is fatiguing, offer to stop and resume later — the skill is idempotent.

## Re-run behavior (scope changes later)

If `project.md` already exists, treat this as a scope evolution:

- Read the existing project.md fully.
- Ask what's changing: new scope? new constraints? pivoted vision?
- Rewrite sections affected by the change. Leave untouched sections alone.
- Update the "Initial Feature Set" list:
  - Keep entries for features that already exist in `.specs/`, syncing their checkbox state to the feature's `status:` frontmatter (done → checked, anything else → unchecked).
  - Add new proposed features based on the evolved scope.
  - Remove entries for features that were explicitly dropped.
- **Never delete or rename existing feature folders.** Feature work is orthogonal to vision evolution. A feature that's no longer in scope stays in `.specs/` — the user can manually archive it if they want.

## Writes

1. **`.specs/project.md`** — fully rewrite using the template structure. Preserve the feature-set checkbox synchronization logic above.
2. Do NOT create feature folders yet. That's the next step, and it's user-opt-in.

## Scaffolding offer (at the end)

After writing `project.md`, use **AskUserQuestion** to offer scaffolding:

```
Question: "I drafted N candidate features in the Initial Feature Set. Want me to scaffold empty spec folders for them now?"
Options:
1. Yes, scaffold all N features (recommended for most kickoffs)
2. Let me pick which ones — show me the list
3. No, I'll create features manually later via /spek:new
```

If the user selects option 1:

- For each candidate feature, create `.specs/NNN_<slug>/` with a skeleton `spec.md` (same way `/spek:new` does).
- Set `part_of: <project_name>` in each scaffolded spec's frontmatter (use the `name:` field from `project.md`).
- Each scaffolded spec.md's `## Context` section gets a one-line reference back to `project.md`: `> Part of [**<project_name>**](../project.md). See "Initial Feature Set" for one-line scope.`
- Do NOT run `/spek:discuss` or `/spek:plan` on the scaffolded features — that's for the user to do next.

If option 2: list candidates numbered, ask the user to select which ones (free-text or multi-select).

If option 3: skip scaffolding entirely.

## Principles building offer

After the scaffolding offer (whether accepted or not), check `.specs/principles.md`:

- If it does not exist, offer via AskUserQuestion: "No `principles.md` found. Want me to create one now based on what we discussed?" If the user accepts, create the file from `_templates/principles.md.tmpl` first, then proceed to fill it in via the questions below. If the user declines, skip.
- If it exists and still contains template placeholder markers (detect by searching for `<e.g.` in the file content), offer via AskUserQuestion: "Your `principles.md` is still the template. Want me to help fill it in based on what we just discussed?"
- If the user declines, skip.
- If the user accepts, ask up to 5 targeted questions (one at a time), drawing on the project context you just gathered:
  1. **Language and type strictness** — "Primary language? Any strict mode or lint rules you already know you want?" (e.g., TypeScript strict, ESLint no-explicit-any)
  2. **Testing approach** — "Unit tests, integration tests, or both? Colocated with source or in a separate directory? Real database or mocks for integration tests?"
  3. **Architecture patterns** — "Any module boundary rules? How should dependencies flow? (e.g., business logic in `core/`, adapters separate)"
  4. **Documentation** — "JSDoc required? README per module? Anything specific about public API documentation?"
  5. **Security stance** — "Any baseline security rules? (e.g., all secrets via env vars, all user input validated at HTTP boundary)"

  Write concrete, testable principles to the file, replacing the `<e.g., ...>` placeholder bullets with real rules derived from the conversation. Preserve the existing section structure (Code Style, Architecture, Testing, Documentation, Security). Do not invent rules — only write principles the user has confirmed.

## Output to user

End with:
- One-paragraph summary of the project as captured in project.md
- Whether scaffolding was done and for how many features
- Suggested next step: `/spek:discuss <feature-number>` on the highest-priority feature, or manual review of `project.md` if they want to edit before proceeding

## Hard rules

- **Idempotent.** Re-runs update project.md based on the evolving conversation. Never regress: if the user already committed to a decision, don't re-ask unless the user signals the decision is up for reconsideration.
- **Never delete feature folders.** Full stop.
- **Never write Plan or Execution sections** in scaffolded spec.md files. Only Context gets a link back to project.md; everything else stays empty.
- **Scaffolding is opt-in.** Never scaffold without asking.
- **Principles building is opt-in.** Never rewrite `principles.md` without explicit user confirmation via AskUserQuestion. Only write principles the user has confirmed during the conversation — do not fabricate conventions.
- **Principles-aware.** If the emerging vision conflicts with an existing principle (e.g. vision implies a cloud service but principles say "self-hosted only"), flag it explicitly before writing.
- **No sub-agents.** Kickoff is pure conversation with the user. No codebase exploration, no research — you're defining the product, not investigating code.
