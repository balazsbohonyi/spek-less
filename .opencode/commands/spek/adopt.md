---
name: spek:adopt
description: Retroactively create a spec for code that already exists — single-feature or bulk discovery mode. With an argument, reverse-engineers one spec from the described scope. Without an argument, discovers all features in the codebase, produces an editable FEATURES.md checkpoint, then on re-invocation creates specs for each confirmed feature. May spawn Explore sub-agents.
---

# spek:adopt — Reverse-engineer a spec from existing code

Two modes, triggered by argument presence:

- **Single-feature** (argument provided): reverse-engineers one spec from the described scope. The existing behavior, unchanged.
- **Bulk discovery** (no argument): scans the codebase for features, produces `.specs/FEATURES.md` for human review (Phase 1), then on re-invocation creates specs for all confirmed features (Phase 2).

## Inputs

- **Argument provided:** a short description of what to adopt → single-feature mode. Examples: `spek:adopt "the auth flow in src/auth/"`, `spek:adopt "everything changed in the last 3 commits"`.
- **No argument:** bulk discovery mode. Routes based on whether `.specs/FEATURES.md` already exists.

## Reads

1. **`.specs/config.yaml`** (falls back to `~/.claude/spek-config.yaml` if not present; per-project wins when both exist) — `specs_root`, `subagent_threshold`.
2. **`.specs/principles.md`** (if exists).
3. **`.specs/project.md`** (if exists).
4. **`.specs/`** directory listing — to determine next sequential number and check for existing specs.
5. **Existing spec frontmatter** across all specs — for cross-referencing during bulk discovery.
6. **Hint files** (bulk discovery Phase 1 only): `CLAUDE.md`, `AGENTS.md`, `README.md`, `package.json` (or `pyproject.toml`, `Cargo.toml`, etc.).
7. **`.specs/FEATURES.md`** (bulk discovery Phase 2 only).
8. **The code being adopted** — per the mode-specific behavior below.

## Mode Detection

Route based on these checks, in order:

1. User provided an argument? → **Single-feature mode**. Ignore FEATURES.md if it exists.
2. No argument, `.specs/FEATURES.md` exists? → AskUserQuestion: "Found `.specs/FEATURES.md` from a previous discovery. Create specs from it, or start a fresh discovery (deletes FEATURES.md)?" Route accordingly.
3. No argument, no FEATURES.md? → **Bulk discovery Phase 1**.

## Behavior: Single-Feature Mode

1. **Derive feature number and slug** the same way `spek:new` does.
2. **Explore the code:**
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
3. **Create the feature folder** `<specs_root>/NNN_<slug>/`.
4. **Create `spec.md`** from the template, populated from what you learned:
   - **Frontmatter:** `id`, `title`, `created` as normal; `status: done`; `starting_sha:` set to current git HEAD (short SHA); `part_of: <name-value>` if `project.md` exists.
   - **`## Context`:** infer from the code's purpose. If unsure, flag it.
   - **`## Discussion`:** visible design decisions, alternatives, explicit non-choices.
   - **`## Plan`:** all tasks pre-checked (`N. [x]`). Break the work into retrospective tasks. Each task maps to a piece of actual code.
   - **`## Verification`:** leave empty.
5. **Do not create `execution.md`.** Adopted features have no execution history.
6. **If `project.md` exists**, add the standard `> Part of [**{{project_name}}**](../project.md).` link under `## Context`.

## Behavior: Bulk Phase 1 — Discovery

1. Read hint files (`CLAUDE.md`, `AGENTS.md`, `README.md`, `package.json` or equivalent) for project structure clues.
2. AskUserQuestion: "Do you have a PRD or feature list to reference?" If yes, read it and use as primary source for feature boundaries with heuristic discovery as validation.
3. Spawn one Explore sub-agent with the breadth-first discovery prompt (see Explore Sub-Agent Prompts below).
4. If results are ambiguous (many medium/low confidence features, large unmapped areas), spawn a second narrower Explore targeting the ambiguous area. **Cap at 2 Explore sub-agents total.**
5. Cross-reference with existing spec frontmatter. Skip features that already have specs.
6. Apply convention heuristics (routes → pages → modules → store slices → top-level directories).
7. **Consolidate related candidates.** Review all discovered candidates and merge those that:
   - Share the same primary source file (e.g., multiple candidates from `indexer.rs` → one "Indexer" feature).
   - Are all small UI components in the same `components/` directory → one "UI component library" feature.
   - One is clearly a sub-concern of another (e.g., "auto-reindex on filesystem" is part of "indexer pipeline").
   - Share a common domain prefix in their route/module paths.
   - When merging, combine their Files lists (deduplicated) and write a Summary that covers the merged scope.
   - Target: 10–20 features after consolidation. If count is still above 20, apply a second pass looking for weaker merge signals (shared imports, co-tested modules).
   - If consolidation reduces below 3 features, report this and suggest the codebase may be best served by single-feature adopt.
8. Write `.specs/FEATURES.md` using the format below. Soft cap at 30 features (should be rare after consolidation) — if more found, include the 30 most clearly-bounded and add a warning in the prologue and output.
9. **STOP.** Tell user FEATURES.md was created, they should review/edit it, then re-run `spek:adopt` (no argument).

If zero features are discovered, do not create FEATURES.md. Report the finding and suggest running single-feature adopt with a specific scope.

**FEATURES.md format:**

```markdown
# Discovered Features

> Generated by spek:adopt. Edit freely: reorder, reword, add features, or
> strike through (`~~like this~~`) features you don't want. Then re-run
> `spek:adopt` (no argument) to create specs for each remaining feature.

## 001: User Authentication
**Signals:** routes (`/login`, `/logout`), directory (`src/auth/`)
**Files:** `src/auth/client.ts` `src/auth/RequireAuth.tsx` `src/pages/Login.tsx`
**Summary:** Login/logout with cookie-based sessions, route guarding via RequireAuth HOC.
```

## Behavior: Bulk Phase 2 — Synthesis

1. Parse FEATURES.md: split on `## NNN:` headings. Extract number/title (from heading), Files (from `**Files:**` backtick-enclosed paths), Summary (from `**Summary:**`).
2. Skip struck-through entries (`~~title~~`) and malformed entries (missing title or files). Report skipped entries in output.
3. Cross-reference each feature's files against existing spec frontmatter. Skip already-specced features.
4. For each valid feature (sequentially, in main agent):
   - Read the listed files.
   - Create `<specs_root>/NNN_<slug>/spec.md`: `status: done`, `starting_sha:` at current HEAD, inferred Context/Discussion/Plan with all tasks `[x]`, empty Verification, no execution.md.
   - Derive slug + number (next sequential, as `spek:new`).
   - If `project.md` exists, add back-reference.
5. Every 10 features: AskUserQuestion checkpoint ("Created N of M specs. Continue?").
6. Offer to delete FEATURES.md via AskUserQuestion.

If zero valid features remain after parsing, offer to delete FEATURES.md or re-run discovery.

## Explore Sub-Agent Prompts

**Single-feature prompt** (used in single-feature mode when scope is a folder/description):
```
Map the code related to <user's description>. Return:
- File layout and responsibilities
- Main abstractions and how they connect
- Entry points (public APIs, routes, CLI commands, etc.)
- Any obvious design decisions visible in the code
- Anything that looks half-finished or unclear
```

**Bulk discovery prompt** (used in Phase 1):
```
Perform a breadth-first survey of this codebase to identify distinct features.
Prefer fewer, broader features over many narrow ones. Merge sub-concerns that
share a directory, source file, or domain concept into a single feature. A
feature should describe a user-facing capability or a cohesive subsystem, not
a single utility.

Return:

1. DIRECTORY LAYOUT — top-level src/ (or equivalent) structure, grouped by domain.
2. ROUTE / ENDPOINT MAP — every URL route, API endpoint, or CLI command. Group by domain.
3. MODULE BOUNDARIES — directories/modules with minimal cross-imports, their own state, distinct vocabulary.
4. ENTRY POINTS — public APIs, exported interfaces, main/index files per module.
5. ALREADY-SPECCED FEATURES — cross-reference with these existing spec titles: <list from existing spec frontmatter>.

Convention signals to prioritize: route groups, page components, domain folders, store slices, test-suite boundaries.

Anti-patterns — do NOT create separate features for:
- Functions within the same module (e.g., icon extraction + lnk resolution + auto-reindex are all part of "Indexer").
- Individual UI components in the same components/ directory unless they represent a distinct user workflow.
- Utilities/helpers that exist to support a single larger feature.
- CRUD operations on the same entity (create/read/update/delete → one feature).

For each candidate feature return:
- title (imperative mood)
- key files/dirs
- one-line purpose
- confidence (high/medium/low)
- merge_with: number of another candidate this could merge with, or "standalone"

Target 15–20 well-bounded features. Return at most 30 candidates. If more exist,
return the 30 most clearly-bounded and note that more were found.
```

## Writes

- **Single-feature mode:** `<specs_root>/NNN_<slug>/spec.md` — creates the feature folder and spec. No `execution.md`, no source edits.
- **Bulk Phase 1:** `.specs/FEATURES.md` — the editable feature list. Nothing else.
- **Bulk Phase 2:** `<specs_root>/NNN_<slug>/spec.md` for each confirmed feature. Optionally deletes `.specs/FEATURES.md` if user confirms.

## Output to user

**Single-feature:**
```
Adopted <N files / git range / description> as .specs/NNN_<slug>/

- Context: <one-line summary of inferred purpose>
- Plan: N retrospective tasks (all marked done)
- starting_sha: <sha> (HEAD at adopt time)
- Flags: <anything you were unsure about, if any>

Next step: run /spek:verify to check that the Plan matches the code.
```

**Bulk Phase 1 (Discovery):**
```
Discovered N features and wrote .specs/FEATURES.md

Review and edit the file — reorder, reword, add features, or strike through
(`~~like this~~`) features you don't want. Then re-run /spek:adopt
(no argument) to create specs for each remaining feature.
```

**Bulk Phase 2 (Synthesis):**
```
Created N specs from .specs/FEATURES.md

- Skipped: M already-specced, K struck-through, L malformed
- Specs created: list of NNN_<slug> entries
- <If offered to delete FEATURES.md, note user's choice>

Next step: run /spek:verify on individual specs to confirm Plans match code.
```

## Hard rules

- **Never modify source code.** Adoption is read-only.
- **Sub-agent for breadth.** Delegate to Explore when scope is broad. Cap at 2 Explore sub-agents per invocation.
- **Be honest about inference.** If you can't tell WHY code exists, say so. Do not fabricate product rationale.
- **Principles check.** When writing retrospective Plans, compare code against `principles.md`. Surface gaps, don't rewrite.
- **No execution.md.** Adopted features skip the execution log entirely.
- **Argument wins over FEATURES.md.** If both exist, single-feature mode runs. FEATURES.md is untouched.
- **Cap at 30 features.** With warning in FEATURES.md prologue and output. Recommend subdirectory-scoped adopt for larger codebases.
- **Consolidate before writing.** Phase 1 must apply a consolidation pass that merges sub-concerns into cohesive features. Target 10–20 features post-consolidation.
- **Sequential Phase 2 synthesis.** No parallel sub-agent fan-out for spec creation. One spec at a time in the main agent.
- **Strikethrough = skip.** `~~title~~` entries in FEATURES.md are skipped during Phase 2.
- **Phase 2 is idempotent per feature.** If a feature from FEATURES.md already has a spec, skip it.
- **Zero features (Phase 1):** do not create FEATURES.md. Report and suggest single-feature with a specific scope.
- **Zero valid features (Phase 2):** offer to delete FEATURES.md or re-run discovery.
- **Malformed FEATURES.md:** best-effort parse, report failures, offer to delete and re-run.
