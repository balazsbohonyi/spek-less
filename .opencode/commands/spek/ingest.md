---
name: spek:ingest
description: Convert existing plans, PRDs, or notes (file or current conversation) into one or more SpekLess specs with graduated status. Use when you already have written material and want proper spec coverage without starting from scratch.
---

# spek:ingest — Convert existing documents into SpekLess specs

You are transforming existing content — a file, a PRD, conversation notes — into properly-formed SpekLess specs. This is the "I already have a plan" entry point, complementing `spek:new` (blank slate) and `spek:adopt` (code-first).

## Inputs

- Optional file path: `spek:ingest path/to/plan.md` — reads the given file.
- No argument: performs a 4-bucket exhaustive extraction of the current conversation, shows a structured multi-section breakdown of what was found, confirms via AskUserQuestion before ingesting. If nothing usable found, asks the user for a file path or pasted text.

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`. If neither exists, stop and point the user at `node install.js`.
2. **`.specs/principles.md`** (if exists) — full file.
3. **`.specs/project.md`** (if exists) — frontmatter `name:` field for `part_of:` assignment.
4. **Existing spec numbering** — Glob both `<specs_root>/[0-9][0-9][0-9]_*/spec.md` and `<specs_root>/[0-9][0-9][0-9].[0-9]*/spec.md`. Parse the 3-digit integer prefix from each match (e.g. `016.1` → `16`), take `max`, assign IDs consecutively from `max + 1`. Never assign `NNN.M` IDs.
5. **Source document** — the file arg if given; otherwise the current conversation.
6. **`_templates/spec.md.tmpl`** — the authoritative structural reference for spec files. Read once before creating any spec in Step 5.

## Behavior

### Step 1 — Acquire content and extract

Perform a 4-bucket exhaustive extraction pass over the source before any confirmation prompt.

**4-bucket extraction:**

- **Bucket 1 — Goal/context:** every stated goal, constraint, and success criterion.
- **Bucket 2 — Decisions:** every alternative considered and rationale given for what was chosen.
- **Bucket 3 — Tasks + approach:** every task with its full implementation detail — not just titles.
- **Bucket 4 — Assumptions/constraints:** every stated dependency, risk, or hard constraint.

Display the extraction as a structured multi-section breakdown (not a one-liner).

- **With file arg:** read the file. Run the 4-bucket extraction and display the structured result.
- **Without arg:** cover the full conversation thread — user framing, exploration exchanges, stated constraints, and any synthesized plan. Do not limit to sections explicitly labeled "plan." Run the 4-bucket extraction and display the structured result. Use AskUserQuestion: "Ingest this content? Options: Yes / No, provide a file path instead." If nothing usable found, ask the user for a file path or pasted text.

### Step 2 — Classify input

**Single vs multi-feature:**
- **Single-feature:** one clear goal with tasks/description. Produce one spec.
- **Multi-feature:** multiple sections each representing a distinct feature or epic. Produce one spec per section.

**Granularity per feature (determines initial `status:`):**
| Granularity | Signal | Status |
|---|---|---|
| Detailed | Tasks + approach details present | `planning` |
| Medium | Task list without approach details | `discussing` |
| High-level | Description only, no task list | `created` |

### Step 3 — Propose the breakdown

**Single-feature:** show a proposed spec summary (ID, title, status, which sections will be filled). Use AskUserQuestion: "Create this spec? Options: Create / Adjust title or scope." A "Create" answer here is the confirmation — Step 4 is skipped for single-feature.

**Multi-feature:** show a table (ID, title, status, notes per feature), note whether `project.md` / `principles.md` will be offered. Use AskUserQuestion: "Proceed with this breakdown? Options: Create all / Adjust the breakdown."

**Iterative adjustment:** if the user wants changes (rename, merge, split), apply them conversationally, re-display the updated table after each change, until the user approves.

### Step 4 — Validation gate (multi-feature only)

Display a final "Ready to create" summary listing every file that will be written:
```
Ready to create:
  .specs/017_auth-system/spec.md        — planning   (5 tasks)
  .specs/018_user-profile/spec.md       — discussing  (3 tasks, no approach)
  .specs/019_dashboard/spec.md          — created     (description only)
```
Use AskUserQuestion: "Confirm creation? Options: Yes, create all / Change something." Only proceed after explicit "Yes."

### Step 5 — Create specs

**Faithfulness mandate:** extract content faithfully — do not summarize meaning, do not paraphrase decisions, do not condense task details. Verbatim or near-verbatim extraction into the relevant spec section is preferred over compressed restatements. The spec should read as though the original author wrote it directly.

For each approved spec:

1. **Slug:** lowercase title, replace spaces/punctuation with hyphens, strip leading/trailing hyphens, max 40 chars.
2. **Collision policy:** if the slug already exists under `<specs_root>/`, append `-2` (then `-3`, …) until unique.
3. **Create** `<specs_root>/<id>_<slug>/spec.md`.
4. **`part_of:`** — read `project.md`'s frontmatter `name:` field if it exists; otherwise leave blank. Use the string value, not a file path.
5. **`starting_sha:`** — always leave blank (captured on first `spek:execute` run).

**Structural reference: `_templates/spec.md.tmpl` is authoritative.**
- Frontmatter field names, order, and format must match the template exactly.
- Section headings and their order must match the template exactly.
- Subsections not present in the template (e.g. `### Goal`) must not appear.
- Content (Context narrative, Discussion body, task text, Assumptions) comes from the ingested source.
- Exception: `planning` specs may use Old/New diff blocks in `### Details` rather than the `**Files:**`/`**Approach:**` skeleton when the ingested material already contains before/after comparisons.

**Section content by granularity:**

| Section | `planning` | `discussing` | `created` |
|---|---|---|---|
| Context | Exhaustively extracted from source | Exhaustively extracted from source | Exhaustively extracted from source |
| Discussion | Filled + import note | Import note + proposed tasks list | Import note only |
| Assumptions | Extracted or "None." | Extracted or "None." | Template placeholder comment |
| Plan | Tasks + Details filled | Template placeholder comment | Template placeholder comment |
| Verification | Template placeholder comment | Template placeholder comment | Template placeholder comment |

**Import note** (first lines of Discussion):
```
_Imported from [filename or "current conversation"] on [date]._
```
For `discussing`: add `_Run \`spek:plan\` to add implementation details before executing._`
For `created`: add `_Run \`spek:discuss\` then \`spek:plan\` to define the approach._`

For `discussing` specs, after the import note:
```
**Proposed tasks** (from import — run `spek:plan` to formalize):
- Task title 1
- Task title 2
```

If `project.md` exists, add under `## Context`: `> Part of [**<name-value>**](../project.md).`

### Step 6 — project.md and principles.md offers

**project.md (multi-feature only):**
- If it doesn't exist AND the ingested content has project-level content (vision, goals, scope, success metrics): offer via AskUserQuestion to create it from `_templates/project.md.tmpl` filled from the source content.
- If it already exists: skip (user can run `spek:kickoff` to evolve it).

**principles.md (single or multi-feature, gated on content):**
1. Scan ingested content for principles-worthy prose: language/framework choices, testing approach, architecture rules, module boundaries, security constraints.
2. If principles-worthy content found AND `principles.md` absent: AskUserQuestion "I found content that may belong in `principles.md`: [list]. Create it with these entries?"
3. If no principles-worthy content found AND `principles.md` absent: AskUserQuestion "No `principles.md` found. Want to create one based on what we just discussed?" — if accepted, ask up to 5 targeted questions exactly as `skills/kickoff.md`'s "Principles building offer" section specifies (one source of truth).
4. If `principles.md` exists and contains `<e.g.` placeholder markers: offer to fill in based on ingested content.
5. If `principles.md` exists and is filled: skip.
6. Only write principles the user has confirmed — never fabricate.

## Writes

- **`<specs_root>/NNN_<slug>/spec.md`** — one per approved feature, populated per granularity table above.
- **`.specs/project.md`** — only if offered and user confirmed (multi-feature path, file absent).
- **`.specs/principles.md`** — only if offered and user confirmed.
- Does NOT create `execution.md` — that's `spek:execute`'s job.
- Does NOT touch source files, `config.yaml`, or any existing spec.

## Output to user

```
Created N spec(s):
  .specs/017_auth-system/spec.md       — planning   (5 tasks)
  .specs/018_user-profile/spec.md      — discussing  (3 tasks)

Next steps:
  - planning specs: run /spek:execute to implement
  - discussing specs: run /spek:plan to add implementation details
  - created specs: run /spek:discuss then /spek:plan to define the approach
```

## Hard rules

- **Never overwrite an existing spec.** If slug collides, append `-2`. ID collisions cannot occur (IDs are `max + 1`).
- **Never commit automatically.** No git operations.
- **Never spawn sub-agents.** Ingest runs in the main conversation. The user must be able to steer mid-step.
- **Never skip confirmation.** Both Step 3 (single-feature "Create") and Step 4 (multi-feature "Yes") are hard gates — no file creation before explicit user approval.
- **Never write principles the user hasn't confirmed.** Only populate `principles.md` with rules derived from the conversation.
- **Principles-consistent.** Every spec section must be consistent with `principles.md`. If the ingested content contradicts a principle, flag it in the Discussion section rather than silently omitting it.
- **Idempotent.** Re-running with the same content proposes new specs (with `-2` slugs if needed) rather than overwriting existing ones.
