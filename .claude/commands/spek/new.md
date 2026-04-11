---
name: spek:new
description: Create a new feature spec folder with skeleton spec.md. Use at the start of a new feature when you know the rough scope. For greenfield projects use /spek:kickoff first. For retroactively documenting existing code use /spek:adopt.
---

# /spek:new — Create a new feature

You are creating a new SpekLess feature spec folder. This is the lightest entry point — it creates the skeleton and returns. It does not conduct a discussion or write a plan. The user will invoke `/spek:discuss` and `/spek:plan` next.

## Inputs

- User's argument: a short title or description of the feature (required). Example: `/spek:new "Add dark mode toggle"`.
- If no argument provided, ask the user for one sentence describing the feature before proceeding.

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — to get `specs_root` and confirm SpekLess is installed. If neither config file exists, tell the user SpekLess hasn't been installed yet and point them at `node install.js`. Stop.
2. **`.specs/principles.md`** (if it exists) — optional, for context when writing the initial Context stub.
3. **`.specs/project.md`** (if it exists) — optional. If present, the new feature's Context section should include a one-line reference back to the project vision so the connection is visible to readers.
4. **Existing spec numbering** — to determine the next sequential feature number, Glob for `<specs_root>/[0-9][0-9][0-9]_*/spec.md` (matches files, not directories — the Glob tool does not return directories). Parse the 3-digit prefix from each returned path. The next number is `max + 1`, zero-padded to 3 digits. If the highest existing is `011_*/spec.md`, the new one is `012`. Gaps from deleted features are fine; do not backfill.

## Behavior

1. Derive a URL-safe slug from the title: lowercase, replace spaces and punctuation with hyphens, strip leading/trailing hyphens, max 40 chars.
2. Create the folder `<specs_root>/NNN_<slug>/` (zero-padded number).
3. Create `<specs_root>/NNN_<slug>/spec.md` from `<specs_root>/_templates/spec.md.tmpl`, substituting:
   - `{{ID}}` → the zero-padded number
   - `{{TITLE}}` → the user's title (preserve case, strip surrounding quotes)
   - `{{DATE}}` → today's date in `YYYY-MM-DD` format
   The created spec will have `status: created` in its frontmatter.
4. If `project.md` exists, read its frontmatter `name` field (a plain string like `SpekLess`) and:
   - Set `part_of: <name-value>` in the new spec's frontmatter — use the string value, NOT a file path.
   - Add a single line under the `## Context` heading: `> Part of [**<name-value>**](../project.md).`
5. Do NOT create `execution.md` yet — that file is created by `/spek:execute` on its first run.
6. Do NOT set `starting_sha` in frontmatter — that field is written by `/spek:execute`.

## Writes

- **`<specs_root>/NNN_<slug>/`** — new folder
- **`<specs_root>/NNN_<slug>/spec.md`** — skeleton spec from template, with `## Context` stub (and project.md back-reference if applicable)
- Does NOT create `execution.md` — that's `/spek:execute`'s job on first run
- Does NOT touch any existing spec or source file

## Output to user

A concise confirmation: the folder path, the spec.md path, and a suggestion of the next step:

```
Created .specs/003_add-dark-mode-toggle/spec.md

Next step: run /spek:discuss to flesh out Context and explore the approach,
or /spek:plan if the feature is simple enough to plan directly.
```

## Hard rules

- This skill is non-interactive beyond asking for the title if missing. Do not ask clarifying questions about scope — that's `/spek:discuss`'s job.
- Never overwrite an existing feature folder. If the derived slug collides (very rare), append `-2` to the slug.
- Never spawn sub-agents.
- **Idempotent within a session.** Running twice with the same title creates a second folder with a `-2` slug suffix rather than overwriting the first. The existing feature folder is never touched.
- Section-scoped: you own the newly-created `spec.md`. Do not touch other files except to read them.
