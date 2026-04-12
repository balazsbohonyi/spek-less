---
id: 017
title: Add /spek:ingest skill — convert plans/PRDs to specs
status: done
part_of: SpekLess
starting_sha: 3bd58e1
created: 2026-04-13
tags: [skills, entry-points, workflow]
---

# Add /spek:ingest skill — convert plans/PRDs to specs

## Context

> Part of [**SpekLess**](../project.md).

SpekLess has four entry-point skills today:

- `/spek:kickoff` — conversational greenfield project setup (no document yet)
- `/spek:new` — creates a bare skeleton spec for a single new feature
- `/spek:adopt` — retroactively documents code that already exists
- `/spek:quick` — one-sentence task with inline spec + execution (skips discuss/plan)

None of these handles the case where the user already has a plan, PRD, or notes — either in a file or from a planning conversation that just happened — and wants to convert that into proper SpekLess specs without starting over.

**Goal:** A user who has written a plan, been given a PRD, or just finished a planning conversation runs `/spek:ingest` and gets properly-formed SpekLess specs — with the right status, filled sections, import notes, and optionally a `project.md` and `principles.md` — ready to execute without re-planning from scratch.

**Out of scope:** Importing from external tools (Jira, Linear, Notion), structured data formats (CSV, JSON), or anything other than markdown/text documents or current conversation context.

## Discussion

### Why graduated status rather than always creating `planning`-status specs

A spec with `status: planning` signals "the approach is decided; start coding." Importing a high-level feature bullet from a PRD as `status: planning` is misleading — there are no approach decisions yet. Graduated status preserves the meaning of each lifecycle stage, so the user knows exactly which tool to run next without reading the spec content:

- Tasks + approach details present → `status: planning` (ready to execute)
- Task list without approach details → `status: discussing` (run `/spek:plan` to add implementation approach)
- Description only, no task list → `status: created` (run `/spek:discuss` then `/spek:plan`)

### Why a validation gate *for multi-feature only*

Creating N spec files is hard to undo. For multi-feature PRDs, a final "Ready to create" summary (every file that will be written) before touching the filesystem prevents the "I created 10 wrong specs" mistake.

For single-feature ingestion, Step 3's "Create / Adjust title or scope" AskUserQuestion is already the explicit confirmation — a second gate would be redundant friction. Single-feature runs therefore skip the validation gate; multi-feature runs always display it.

### principles.md handling — triggered by content, not by shape

Principles extraction is gated on *whether the ingested content carries principles-worthy prose* (language choices, testing stance, architecture rules, security constraints), not on whether the input is single- or multi-feature. A thoughtful single-feature PRD can contain as much principles material as a multi-page multi-feature doc.

The flow:
1. If ingested content contains principles-worthy prose AND `principles.md` is absent → offer to create it with the extracted entries.
2. If no worthy content AND `principles.md` is absent → offer a questions-driven creation flow (same 5 targeted questions as `/spek:kickoff`).
3. If `principles.md` exists with template placeholder markers (`<e.g.` present) → offer to fill based on ingested content.
4. If `principles.md` exists and is filled → skip.
5. Only write principles the user explicitly confirmed — never fabricate.

`project.md` creation remains multi-feature-only, since it is a project-level artifact with no natural fit for a single-feature import.

### Relationship to `/spek:kickoff`

These are complementary, not competing. Kickoff is conversational — for when you don't have a document and need to think through the product from scratch. Ingest is document-driven — for when you already have a plan or PRD. Both can create `project.md` and `principles.md`, but the user picks based on what they have.

### Input method for no-arg invocation

When invoked without a file argument, the skill scans the current conversation context. Plans and PRDs are recognizable by structure: feature sections, task lists, decision rationales. The skill summarizes what it found and confirms before proceeding. This enables the natural workflow: "I just planned something in this conversation — ingest it." If nothing is found, it asks for a file path or pasted text.

### Idempotency — `-2` suffix on slug collision

To match `/spek:new` and `/spek:quick`, slug collisions append `-2` (then `-3`, …) rather than warn-and-skip. This keeps every requested spec from being silently dropped, and it mirrors the only collision policy the rest of the framework uses, so the user never has to learn a second one.

ID collisions cannot happen — IDs are computed from `max + 1` of existing specs — so the `-2` suffix only applies to the slug portion when two ingested titles derive to the same folder name.

### Entry-point ordering

Across `README.md`, `CLAUDE.md`, `_templates/spekless-block.md.tmpl`, and the `docs/architecture.md` file inventory, the entry-point list reads:

```
kickoff → ingest → new → adopt → quick
```

This groups by "starting point" — vision-from-nothing, vision-from-document, blank-feature, from-code, one-shot.

### Sibling-ID awareness (NNN.M)

Decimal sibling IDs (`016.1`, `016.2`, …) for specs are considered in `/spek:plan`'s decomposition flow. Top-level ID assignment must glob **both** `[0-9][0-9][0-9]_*/spec.md` and `[0-9][0-9][0-9].[0-9]*/spec.md`, then parse the 3-digit integer prefix from each match. Including siblings in the glob is harmless — `016.1` parses to `16`, same as `016` — so the sequential integer count is preserved. `/spek:ingest` never assigns an `NNN.M` ID; that space is reserved for `/spek:plan`'s decomposition.

## Assumptions

None.

No external bets — all changes are to skill files, templates, and documentation within this repository.

## Plan

### Tasks

1. [x] Create `skills/ingest.md` — full skill implementation
2. [x] Update `README.md` — add `/spek:ingest` row and bump skill count (eleven → twelve)
3. [x] Update `CLAUDE.md` — directory listing and entry-points list
4. [x] Update `_templates/spekless-block.md.tmpl` — add `/spek:ingest` to entry-points line (Sync Rule)
5. [x] Update `docs/architecture.md` — file inventory and ownership sections
6. [x] Update `docs/maintenance.md` and `docs/comparison.md`
7. [x] Sync to `.claude/commands/spek/ingest.md` (and global if present)

### Details

#### 1. Create `skills/ingest.md` — full skill implementation

**Files:** `skills/ingest.md`

**Approach:** Write the full skill file using standard SpekLess skill structure (frontmatter → Inputs → Reads → Behavior → Writes → Output to user → Hard rules). Keep under ~300 lines per `principles.md § Code Style`. The skill has 6 behavior steps:

**Step 1 — Acquire content:**
- With file arg (`/spek:ingest path/to/doc.md`): read the file
- Without arg: scan current conversation for plan/PRD content (sections, task lists, decisions); output a one-paragraph summary of what was found; use AskUserQuestion "Ingest this content?"; if nothing found, use AskUserQuestion asking for a file path or pasted text

**Step 2 — Classify input:**
- Single-feature vs multi-feature: single = one clear goal + tasks/description; multi = multiple sections each representing a distinct feature or epic
- Granularity per feature:
  - Detailed: tasks + approach details → `status: planning`
  - Medium: task list without approach details → `status: discussing`
  - High-level: description only, no task list → `status: created`

**Step 3 — Propose the breakdown (AskUserQuestion):**
- Single-feature: show proposed spec summary (ID, title, status, which sections will be filled); options: "Create / Adjust title or scope". **A "Create" answer here is the confirmation — Step 4 is skipped for single-feature.**
- Multi-feature: show table of (ID, title, status, notes per feature); note whether `project.md` / `principles.md` will be offered; options: "Create all / Adjust the breakdown"
- Iterative adjustment: if the user wants changes (rename, merge, split features), continue conversationally, re-display the updated table after each change, until the user approves

**Step 4 — Validation gate (multi-feature only):**
Display a final "Ready to create" summary listing every file that will be written:
```
Ready to create:
  .specs/017_auth-system/spec.md        — planning   (5 tasks)
  .specs/018_user-profile/spec.md       — discussing  (3 tasks, no approach)
  .specs/019_dashboard/spec.md          — created     (description only)
  .specs/project.md                     — new file
  .specs/principles.md                  — new file
```
Use AskUserQuestion: "Confirm creation?" Options: "Yes, create all / Change something." Only proceed to file creation after explicit "Yes" confirmation.

Single-feature ingestion skips this step — Step 3's "Create" is the confirmation.

**Step 5 — Create specs:**
For each approved spec:
- Determine folder slug from title (lowercase, hyphenated, leading/trailing hyphens stripped, max 40 chars)
- Create `<specs_root>/<id>_<slug>/spec.md`
- ID assignment: Glob **both** `<specs_root>/[0-9][0-9][0-9]_*/spec.md` and `<specs_root>/[0-9][0-9][0-9].[0-9]*/spec.md` (the second picks up sibling specs from `/spek:plan`'s decomposition flow). Parse the 3-digit integer prefix from each match, take `max`, assign consecutive IDs from `max + 1`. Parsing the integer prefix makes the sibling glob harmless — `016.1` parses to `16`, same as `016`. Never assign an `NNN.M` ID.
- Set `part_of:` from `project.md`'s frontmatter `name:` field if `project.md` exists; otherwise leave empty. Do not consult `config.project_hints` for this field — matches `/spek:new` and `/spek:kickoff` conventions.
- Populate content per section based on granularity:

| Section | `planning` | `discussing` | `created` |
|---|---|---|---|
| Context | Filled | Filled | Filled |
| Discussion | Filled + import note | Filled + import note + proposed tasks list | Import note only |
| Assumptions | Extracted or "None." | Extracted or "None." | Template comment |
| Plan | Tasks + Details filled | Template comment | Template comment |
| Verification | Template comment | Template comment | Template comment |

Import note (first lines of Discussion for non-`planning`; brief note for `planning`):
```
_Imported from [filename or "current conversation"] on [date]._
```
For `discussing`: add `_Run \`/spek:plan\` to add implementation details before executing._`
For `created`: add `_Run \`/spek:discuss\` then \`/spek:plan\` to define the approach._`

For `discussing` specs, append after the import note:
```
**Proposed tasks** (from import — run `/spek:plan` to formalize):
- Task title 1
- Task title 2
```

Always leave `starting_sha:` blank (captured on first `/spek:execute` run).

**Collision policy:** If the derived slug already exists under `<specs_root>/`, append `-2` (then `-3`, …) until unique. Never overwrite. Matches `/spek:new` and `/spek:quick`. (ID collisions cannot occur — IDs are computed from `max + 1`.)

**Step 6 — project.md and principles.md offers:**

*project.md (multi-feature only):*
- If it doesn't exist AND the ingested content has project-level content (vision, goals, scope, success metrics): offer via AskUserQuestion to create it from `_templates/project.md.tmpl` filled from PRD content
- If it already exists: skip (don't overwrite; user can run `/spek:kickoff` to evolve it)

*principles.md (any input — single or multi-feature — gated on content):*
1. Scan ingested content for principles-worthy prose: language/framework choices, testing approach, architecture rules, module boundaries, security constraints
2. If principles-worthy content found AND `principles.md` absent: AskUserQuestion "I found content that may belong in `principles.md`: [list]. Create it with these entries?"
3. If no principles-worthy content found AND `principles.md` absent: AskUserQuestion "No `principles.md` found. Want to create one based on what we just discussed?" — if accepted, ask up to 5 targeted questions exactly as `skills/kickoff.md`'s "Principles building offer" section specifies (delegate to that prose so there is one source of truth)
4. If `principles.md` exists with template placeholder markers (contains `<e.g.`): offer to fill in based on ingested content
5. If `principles.md` exists and is filled: skip
6. Only write principles the user has confirmed — never fabricate

#### 2. Update `README.md` — add `/spek:ingest` row and bump skill count

**Files:** `README.md`

**Approach:** Read `README.md` to locate the spots exactly, then:

1. **Count bumps** — three places currently say "eleven" in a literal-count sense:
   - Opening paragraph (~L5): `A set of eleven workflow skills` → `A set of twelve workflow skills`
   - Skills-section heading (~L81): `## The eleven skills` → `## The twelve skills`
   - Status section (~L326): `Eleven skills, installer, templates` → `Twelve skills, installer, templates`

2. **Entry-points table** — add `/spek:ingest` row between `/spek:kickoff` and `/spek:new` (the agreed ordering). One-line description: "Convert existing plans, PRDs, or notes (file or current conversation) into one or more SpekLess specs with graduated status."

3. **Do not touch** the "Ten skills, not thirty subagents" bullet (~L24) — that is framing rhetoric, not a literal count.

#### 3. Update `CLAUDE.md` — directory listing and entry-points list

**Files:** `CLAUDE.md`

**Approach:** Two edits, ordering = `kickoff → ingest → new → adopt → quick`:

1. Repository-structure block (`skills/` listing): add `ingest.md` to the entry-points group, between `kickoff.md` and `new.md`.
2. Trailing `## SpekLess` block *Entry points* line: add `/spek:ingest` between `/spek:kickoff` and `/spek:new`.

Read the file first to locate both spots exactly. Do not touch anything else.

#### 4. Update `_templates/spekless-block.md.tmpl` — add `/spek:ingest` to entry-points line *(Sync Rule)*

**Files:** `_templates/spekless-block.md.tmpl`

**Approach:** The *Entry points* bullet in this template is rendered into every newly installed project's `CLAUDE.md` by `install.js`. Per `.specs/principles.md § Sync Rule` ("When adding a new skill, also update `_templates/spekless-block.md.tmpl`"), this update is mandatory — without it, projects installed after this feature lands will have a `CLAUDE.md` block that omits `/spek:ingest`.

Edit the entry-points line so it reads:
```
  - *Entry points:* `/{{NAMESPACE}}:kickoff`, `/{{NAMESPACE}}:ingest`, `/{{NAMESPACE}}:new`, `/{{NAMESPACE}}:adopt`, `/{{NAMESPACE}}:quick`
```

No other lines in the template change.

#### 5. Update `docs/architecture.md` — file inventory and ownership sections

**Files:** `docs/architecture.md`

**Approach:** Three targeted edits:

1. **File inventory** (near the bottom, `skills/` listing): add `├── ingest.md  # document-to-specs entry point` in the entry-points group, positioned between `kickoff.md` and `new.md`.

2. **`principles.md` ownership paragraph**: currently says `/spek:kickoff` is the only skill that may write to it and "No other skill writes to it." Update to acknowledge that `/spek:ingest` also writes to it (triggered by content on either single- or multi-feature inputs), using the same opt-in, user-confirmed pattern as kickoff.

3. **`project.md` ownership paragraph**: currently says `/spek:kickoff` owns it exclusively. Update to note that `/spek:ingest` may also create it on the multi-feature path when it doesn't exist and the ingested PRD contains project-level content (vision, goals, scope) — the user must confirm before creation.

Read each paragraph first to locate the exact text before editing.

#### 6. Update `docs/maintenance.md` and `docs/comparison.md`

**Files:** `docs/maintenance.md`, `docs/comparison.md`

**Approach:**

*maintenance.md:* One edit — the manual smoke test says `"should contain all 11 skill files"`; change to 12.

*comparison.md:* Two edits:
1. In the feature matrix table, find the "Greenfield PRD layer" row and add an adjacent row in the same "Context and knowledge" section: `| Ingest existing plans / PRDs to specs | ✓ (\`/spek:ingest\`) | ✗ | ✗ | ✗ |`
2. In the "What's genuinely novel in SpekLess" section, add a short subsection after the `/spek:adopt` entry (before "Intervention as 'just re-run a skill'"):
   ```
   ### `/spek:ingest` — document-driven spec creation

   When the user already has a plan, PRD, or notes, `/spek:ingest` converts them into properly-formed specs with graduated status, an import note, optional `project.md` creation, and a `principles.md` offer when the content warrants it. No existing framework offers this document-to-specs path.
   ```

Read each file to locate the exact insertion points before editing.

**Note on `install.js`:** No changes needed. The installer copies skills via `fs.readdirSync(skillsSrc).filter(f => f.endsWith('.md'))` — a generic read of the `skills/` directory. Adding `ingest.md` to `skills/` is sufficient; the installer picks it up automatically on the next `node install.js` run.

#### 7. Sync to `.claude/commands/spek/ingest.md`

**Files:** `.claude/commands/spek/ingest.md`, `~/.claude/commands/spek/ingest.md` (if the global directory exists)

**Approach:** Copy `skills/ingest.md` to `.claude/commands/spek/ingest.md`. Check whether `~/.claude/commands/spek/` exists; if so, copy there as well (do not create it if absent). Run a diff to confirm the copies match exactly. Mandatory per the Sync Rule in `principles.md`.

## Verification

**Task-by-task check:**
- Task 1 — Create `skills/ingest.md`: ✓ — 141 lines, all 6 steps (Acquire → Classify → Propose → Validate → Create → Offer), correct section order, "Never spawn sub-agents" in Hard rules, single-feature skips Step 4 gate, `starting_sha:` blank, `-2` collision policy, sibling glob for NNN.M IDs (`skills/ingest.md:L1-141`)
- Task 2 — Update `README.md`: ✓ — "twelve" at L5, L81, L327; `/spek:ingest` row between kickoff and new at L90; "Ten skills, not thirty subagents" (L24) untouched
- Task 3 — Update `CLAUDE.md`: ✓ — "Twelve slash skills" at L13; `ingest.md` in skills/ listing at L63; `/spek:ingest` in entry-points line at L171
- Task 4 — Update `_templates/spekless-block.md.tmpl`: ✓ — `/{{NAMESPACE}}:ingest` in entry-points line at L9, `{{NAMESPACE}}` placeholders preserved
- Task 5 — Update `docs/architecture.md`: ✓ — `ingest.md` in file inventory at L224 (between kickoff and new); ownership paragraphs for `principles.md` (L100) and `project.md` (L104) updated to acknowledge `/spek:ingest`
- Task 6 — Update `docs/maintenance.md` and `docs/comparison.md`: ✓ — smoke test says "12 skill files" at L131; feature matrix row at L33; `/spek:ingest` subsection in novel-features at L129–131
- Task 7 — Sync to `.claude/commands/spek/ingest.md`: ✓ — files byte-identical (141 lines each); global `~/.claude/commands/spek/` absent, no copy needed

**Principles check:**
- Code Style (≤300 lines): ✓ — 141 lines
- Code Style (sections order): ✓ — Inputs → Reads → Behavior → Writes → Output to user → Hard rules
- Single-agent topology: ✓ — "Never spawn sub-agents" hard rule at `skills/ingest.md:L137`
- Section ownership: ✓ — skill creates only new spec files; does not touch existing specs, execution.md, or other sections
- Document is state: ✓ — no STATE.md or lockfiles created
- Append-only log: ✓ — execution.md has only appended entries, no rewrites
- Sync Rule: ✓ — `skills/ingest.md` → `.claude/commands/spek/ingest.md` synced; `_templates/spekless-block.md.tmpl` updated

**Assumptions check:** *(no checkbox entries — omitted)*

**Goal check:** The implementation fully delivers the stated goal. A user with a plan, PRD, or notes can run `/spek:ingest` and receive properly-formed specs with graduated status (`planning` / `discussing` / `created`), import notes, section content scaled to granularity, and optional `project.md` / `principles.md` offers — all gated behind explicit user confirmation before any file is written. Out-of-scope items (external tool imports, structured data formats) are correctly excluded. All documentation cross-references use the current `docs/comparison.md` filename throughout.

**Issues found:** None.

**Status:** READY_TO_SHIP
