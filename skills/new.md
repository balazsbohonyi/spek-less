---
name: lean:new
description: Create a new feature spec folder with skeleton spec.md. Use at the start of a new feature when you know the rough scope. For greenfield projects use /lean:kickoff first. For retroactively documenting existing code use /lean:adopt.
---

# /lean:new — Create a new feature

You are creating a new LeanSpec feature spec folder. This is the lightest entry point — it creates the skeleton and returns. It does not conduct a discussion or write a plan. The user will invoke `/lean:discuss` and `/lean:plan` next.

## Inputs

- User's argument: a short title or description of the feature (required). Example: `/lean:new "Add dark mode toggle"`.
- If no argument provided, ask the user for one sentence describing the feature before proceeding.

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/lean-spec-config.yaml` if not present; per-project wins when both exist) — to get `specs_root` and confirm LeanSpec is installed. If neither config file exists, tell the user LeanSpec hasn't been installed yet and point them at `install.sh`. Stop.
2. **`.specs/principles.md`** (if it exists) — optional, for context when writing the initial Context stub.
3. **`.specs/project.md`** (if it exists) — optional. If present, the new feature's Context section should include a one-line reference back to the project vision so the connection is visible to readers.
4. **`.specs/`** directory listing — to determine the next sequential feature number. Numbers are zero-padded to 3 digits. If the highest existing is `007_*/`, the new one is `008`. Gaps from deleted features are fine; do not backfill.

## Actions

1. Derive a URL-safe slug from the title: lowercase, replace spaces and punctuation with hyphens, strip leading/trailing hyphens, max 40 chars.
2. Create the folder `<specs_root>/NNN_<slug>/` (zero-padded number).
3. Create `<specs_root>/NNN_<slug>/spec.md` from `<specs_root>/templates/spec.md.tmpl`, substituting:
   - `{{ID}}` → the zero-padded number
   - `{{TITLE}}` → the user's title (preserve case, strip surrounding quotes)
   - `{{DATE}}` → today's date in `YYYY-MM-DD` format
   The created spec will have `status: created` in its frontmatter.
4. If `project.md` exists, add a single line under the `## Context` heading of the new spec: `> Part of [**{{project_name}}**](../project.md).` (read `project.md`'s frontmatter `name` field for the project name).
5. Do NOT create `execution.md` yet — that file is created by `/lean:execute` on its first run.
6. Do NOT set `starting_sha` in frontmatter — that field is written by `/lean:execute`.

## Output to user

A concise confirmation: the folder path, the spec.md path, and a suggestion of the next step:

```
Created .specs/003_add-dark-mode-toggle/spec.md

Next step: run /lean:discuss to flesh out Context and explore the approach,
or /lean:plan if the feature is simple enough to plan directly.
```

## Hard rules

- This skill is non-interactive beyond asking for the title if missing. Do not ask clarifying questions about scope — that's `/lean:discuss`'s job.
- Never overwrite an existing feature folder. If the derived slug collides (very rare), append `-2` to the slug.
- Never spawn sub-agents.
- Section-scoped: you own the newly-created `spec.md`. Do not touch other files except to read them.
