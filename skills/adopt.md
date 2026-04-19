---
name: spek:adopt
description: Retroactively create a spec for code that already exists — reverse-engineers Context and Plan from the actual files. Use when you built something without SpekLess and want documentation + a verification baseline after the fact. May spawn an Explore sub-agent.
---

# spek:adopt — Reverse-engineer a spec from existing code

You are creating a feature spec for code that was written WITHOUT SpekLess and needs to be retroactively documented. The spec should read as if the author had used SpekLess from the start: Context explains why the code exists, Plan describes the work as if it were planned up-front (with all tasks pre-checked since the work is done).

## Inputs

- **Required argument:** a short description of what to adopt. Examples:
  - `spek:adopt "the auth flow in src/auth/"`
  - `spek:adopt "everything changed in the last 3 commits"`
  - `spek:adopt "the billing module — files listed below" file1.ts file2.ts`
- If no argument given, ask the user to describe the scope before proceeding.

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`, `subagent_threshold`.
2. **`.specs/principles.md`** (if exists).
3. **`.specs/project.md`** (if exists).
4. **`.specs/`** directory listing — to determine next sequential number.
5. **The code being adopted:**
   - If the user supplied file paths, read those files directly (up to `subagent_threshold` worth of reads).
   - If the user supplied a git range (e.g. "last 3 commits"), run `git log <range> --name-only` and read the changed files.
   - If the user supplied a folder or abstract description ("the auth flow"), **delegate to an Explore sub-agent** with a prompt like:
     ```
     Map the code related to <user's description>. Return:
     - File layout and responsibilities
     - Main abstractions and how they connect
     - Entry points (public APIs, routes, CLI commands, etc.)
     - Any obvious design decisions visible in the code
     - Anything that looks half-finished or unclear
     ```
     The sub-agent returns a distilled summary; you work from that summary, not raw source.

## Actions

1. **Derive feature number and slug** the same way `spek:new` does.
2. **Create the feature folder** `<specs_root>/NNN_<slug>/`.
3. **Create `spec.md`** from the template, but populate it from what you learned:
   - **Frontmatter:**
     - `id`, `title`, `created`: as normal
     - `status: done` (the work is already done — this is retroactive)
     - `starting_sha:` set to the current git HEAD (short SHA). The diff baseline is "now," which means `spek:verify` on an adopted feature becomes a documentation check rather than a diff check.
     - `part_of: <name-value>` if `project.md` exists — read its frontmatter `name` field (a plain string like `SpekLess`); use the string value, NOT a file path.
   - **`## Context`:** infer from the code's purpose, not from commit messages (commits may be noise). Write the "why" as you understand it from what the code does. If unsure, flag it: "The purpose here is inferred; confirm with the author."
   - **`## Discussion`:** write a brief section listing visible design decisions: what abstractions were chosen, what alternatives would have been plausible, what the code seems to explicitly NOT do. This is what a careful reader would say about the code, not what the original author thought.
   - **`## Plan`:** **all tasks pre-checked** (`N. [x]`). Break the work into retrospective tasks — "what would this plan have looked like if written up front?" Each task should map cleanly to a piece of the actual code. Include the Files and Approach fields per the template.
   - **`## Verification`:** leave empty. The user will run `spek:verify` next.
4. **Do not create `execution.md`.** Adopted features have no execution history — the work predates SpekLess. Leave it absent.
5. **If `project.md` exists**, add the same `> Part of [**{{project_name}}**](../project.md).` link under `## Context` that `spek:new` does.

## Writes

- **`<specs_root>/NNN_<slug>/spec.md`** — creates the feature folder and spec file, populated with inferred Context, Discussion, Plan (all tasks pre-checked), and empty Verification. Frontmatter `status: done`, `starting_sha:` set to current HEAD.
- **Nothing else.** No `execution.md`, no source file edits, no config changes.

## Output to user

```
Adopted <N files / git range / description> as .specs/NNN_<slug>/

- Context: <one-line summary of inferred purpose>
- Plan: N retrospective tasks (all marked done)
- starting_sha: <sha> (HEAD at adopt time)
- Flags: <anything you were unsure about, if any>

Next step: run {{CMD_PREFIX}}spek:verify to check that the Plan's task breakdown matches
the actual code. Verify will read each task's Details and confirm the code
exists as described — it flags discrepancies as documentation issues.
```

## Hard rules

- **Never modify source code.** Adoption is read-only. You are writing documentation, not refactoring.
- **Sub-agent for breadth.** When the scope is "a folder" or "a feature area," delegate to Explore. Burning main-context tokens on bulk source reads defeats the purpose of SpekLess.
- **Be honest about inference.** If you can't tell WHY the code exists, say so in Context. Do not fabricate product rationale.
- **Principles check.** When writing the retrospective Plan, compare the actual code against `principles.md`. If the existing code violates a principle, note it in the Plan's task details (e.g. "Task 3 — Approach: uses `any` types; this predates the TypeScript strict mode principle and would need migration to comply"). Don't rewrite to make it compliant; surface the gap.
- **No execution.md.** Adopted features skip the execution log entirely.
