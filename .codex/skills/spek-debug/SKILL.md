---
name: spek-debug
description: Start a bug investigation — structured intake (symptom, expected vs. observed, reproduction steps, initial hypotheses) that creates a spec.md with type:bug and a two-group Plan stub (Investigation / Fix). Entry point only; does not drive the investigation loop.
---

# spek-debug — Open a bug investigation

You are creating a SpekLess spec for a bug. This is the entry point: you conduct a structured intake with the user, then write a `spec.md` with `type: bug` and a Plan stub that `spek-plan` will fill in with concrete investigation and fix tasks.

You do **not** drive the investigation loop. Your job ends when the spec is on disk and the user knows their next step.

## Inputs

- Optional title argument (e.g. `spek-debug "Login fails on Safari"`). If omitted, ask before proceeding.
- Optional free-text description appended after the title — use it to pre-fill intake answers.

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`. If neither config file exists, tell the user SpekLess hasn't been installed yet and point them at `node install.js`. Stop.
2. **`.specs/principles.md`** (if exists) — full file, for context when writing the Context stub.
3. **`.specs/project.md`** (if exists) — optional. If present, read the `name` field from frontmatter to populate `part_of:` and the Context back-reference.
4. **Existing spec numbering** — Glob `<specs_root>/[0-9][0-9][0-9]_*/spec.md` to find the highest 3-digit prefix. Next ID = max + 1, zero-padded. Gaps are fine; never backfill.

## Behavior

### Intake

Conduct a short structured intake. If the user's invocation already answers a question, skip asking it.

Ask (in order, skipping answered ones):

1. **Symptom** — "What goes wrong? One sentence."
2. **Expected vs. observed** — "What should happen? What actually happens?"
3. **Reproduction steps** — "How do you reproduce it? (steps, environment, frequency)"
4. **Initial hypotheses** — "What are your top 1–3 guesses at the root cause? (OK to say 'unknown')"

After all four are answered, confirm you're about to create the spec, then proceed.

### Spec creation

1. Derive a URL-safe slug from the title: lowercase, replace spaces and punctuation with hyphens, strip leading/trailing hyphens, max 40 chars.
2. Create the folder `<specs_root>/NNN_<slug>/`.
3. Write `<specs_root>/NNN_<slug>/spec.md` directly (do not use `spec.md.tmpl` — that template is for feature specs). Content:

```
---
id: NNN
title: <title>
status: planning
part_of: <project name if project.md exists, else blank>
starting_sha:
created: <YYYY-MM-DD>
tags: []
type: bug
confidence: unknown
---

# <title>

## Context

<If project.md exists: `> Part of [**<name>**](../project.md).`>

**Symptom:** <symptom from intake>

**Expected:** <expected behaviour>

**Observed:** <observed behaviour>

**Reproduction:** <steps from intake>

## Discussion

**Hypotheses:**
<numbered list from intake, or "Unknown — investigation needed.">

**Scope:** Investigation is bounded to <area inferred from symptom>. Fix scope TBD pending root-cause confirmation.

## Assumptions

- [ ] Reproduction steps are consistent across runs.

## Plan

<!--
Written by spek-plan. Bug specs use two task groups instead of ### Tasks:
  ### Investigation — tasks to isolate the root cause
  ### Fix — tasks to implement and verify the fix
Run spek-plan to fill in concrete tasks.
-->

### Investigation

> TBD — run `$spek-plan` to generate investigation tasks from the hypotheses above.

### Fix

> TBD — populated by `$spek-plan` after root cause is confirmed.

### Details

> TBD — populated by `$spek-plan`.

## Verification

> Not yet started.

## Retrospective

> Not yet started.
```

4. Do NOT create `execution.md` — that is `spek-execute`'s job on first run.
5. Do NOT set `starting_sha` — that field is written by `spek-execute`.

## Writes

- **`<specs_root>/NNN_<slug>/`** — new folder
- **`<specs_root>/NNN_<slug>/spec.md`** — written inline with intake data populated; `type: bug`, `confidence: unknown` in frontmatter
- Does NOT create `execution.md`
- Does NOT touch any existing spec or source file

## Output to user

```
Created .specs/NNN_<slug>/spec.md  (type: bug, confidence: unknown)

Next step: run $spek-plan to generate Investigation and Fix tasks
from the hypotheses above. Then run $spek-execute to work each task.
```

## Hard rules

- **Entry point only.** Do not ask investigation questions beyond the four intake items. Driving the investigation is the user's and `spek-plan`'s job.
- **Inline spec write.** Never read or substitute from `spec.md.tmpl`. The bug spec structure differs (two-group Plan, `type`/`confidence` frontmatter fields).
- **No overwrite.** If the derived slug collides, append `-2` to the slug.
- **No sub-agents.** Intake and spec creation happen in the main conversation.
- **Canonical references.** Use `spek-<skill>` in internal guidance; `$spek-<skill>` in user-facing output and AskUserQuestion text. Never hardcode `/` or `$`.
- **Principles-aware.** If `principles.md` exists, the written spec must be consistent with it.
