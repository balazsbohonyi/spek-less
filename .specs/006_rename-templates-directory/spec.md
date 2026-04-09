---
id: 006
title: Rename templates directory
status: done
part_of: SpekLess
starting_sha: 4369cf8
created: 2026-04-08
tags: []
---

# Rename templates directory

> Part of [**SpekLess**](../project.md).

## Context

The `templates/` directory (containing five `.tmpl` files) is copied by `install.sh` into `.specs/templates/` during setup. In an installed project, `.specs/` contains both this templates directory and numbered feature folders (`001_*`, `002_*`, …). Because `templates` sorts after the numbers alphabetically, the templates directory appears mixed into the middle of the listing rather than at the top.

Renaming `templates/` → `_templates/` in the SpekLess repo (and therefore in the installed `.specs/` directory) places it before all numbered folders in directory listings, giving a cleaner layout where scaffolding files are visually separated from feature specs.

**Goal:** Rename the directory and update every reference across the codebase — skills, installer, documentation, and completed feature specs.

**Done when:** `grep -r "templates/" --include="*.md" --include="*.sh" --include="*.tmpl" --include="*.yaml"` finds no references to the old name, the directory exists as `_templates/`, and a fresh install places files in `.specs/_templates/`.

## Discussion

**Alternatives considered:** None — the leading-underscore convention is the standard way to sort utility directories first, and no other name was in contention.

**Decisions made:**
- Rename to `_templates/` (not `_scaffolds/`, `_blueprints/`, or other alternatives). The word "templates" is accurate and already familiar to users; only the prefix changes.
- Completed feature specs (003, 004) get their references updated too, since they serve as reference documents describing the system as it should be — not changelogs frozen in time.
- Both the source `skills/` copies and the installed `.claude/commands/spek/` copies get updated (the installer copies skills generically, so both must match).

**Ambiguities resolved:** None — the scope was clear from the start.

**Open questions:** None.

## Plan

### Tasks

1. [x] Rename source directory `templates/` → `_templates/`
2. [x] Update installer (`install.sh`)
3. [x] Update skills (`kickoff.md`, `new.md`) and installed copies
4. [x] Update contributor docs (`CLAUDE.md`, `docs/architecture.md`)
5. [x] Update user-facing docs (`README.md`)
6. [x] Update completed feature specs (003, 004)
7. [x] Smoke test: run installer with --defaults in /tmp and verify _templates/ lands correctly
8. [x] Rename dogfooding project's installed `.specs/templates/` → `.specs/_templates/`

### Details

#### 1. Rename source directory `templates/` → `_templates/`

**Files:** `templates/` → `_templates/`

**Approach:** `git mv templates/ _templates/`. No content changes inside the template files themselves — only the directory name changes.

#### 2. Update installer (`install.sh`)

**Files:** `install.sh`

**Approach:** Three references to update:
- Line 13: comment `Copies templates to .specs/templates/` → `.specs/_templates/`
- Line 42: error check `skills/ or templates/` → `skills/ or _templates/`
- The `cp -r` line (~282-287) that copies `templates/` to `$SPECS_ROOT/templates/` → copies `_templates/` to `$SPECS_ROOT/_templates/`

Verify the error-check path and the copy destination both use the new name consistently.

#### 3. Update skills (`kickoff.md`, `new.md`) and installed copies

**Files:** `skills/kickoff.md`, `skills/new.md`, `.claude/commands/spek/kickoff.md`, `.claude/commands/spek/new.md`

**Approach:** Two skill files reference `templates/`:
- `kickoff.md:90` — references `templates/principles.md.tmpl` → `_templates/principles.md.tmpl`
- `new.md:26` — references `<specs_root>/templates/spec.md.tmpl` → `<specs_root>/_templates/spec.md.tmpl`

Update both source files in `skills/`, then mirror the same changes to the installed copies in `.claude/commands/spek/`.

#### 4. Update contributor docs (`CLAUDE.md`, `docs/architecture.md`)

**Files:** `CLAUDE.md`, `docs/architecture.md`

**Approach:** Four references in CLAUDE.md:
- Line 14: `Five templates in templates/` → `_templates/`
- Line 73: directory tree `templates/` → `_templates/`
- Line 135: `Templates in templates/` → `_templates/`
- Line 152: `The templates/ directory is the exception` → `_templates/`

Two references in `docs/architecture.md`:
- Line 57: directory tree entry `templates/` → `_templates/`
- Line 226: directory tree entry `templates/` → `_templates/`

#### 5. Update user-facing docs (`README.md`)

**Files:** `README.md`

**Approach:** One reference at line 74: `Copies templates to .specs/templates/` → `.specs/_templates/`. Check if any other mentions exist on nearby lines (list items, install output descriptions).

#### 6. Update completed feature specs (003, 004)

**Files:** `.specs/003_installer/spec.md`, `.specs/004_templates-and-scaffolding/spec.md`

**Approach:** These specs describe the system as it should be (per the Discussion decision), so update all references:
- 003 has ~7 references: tasks, verification, approach descriptions mentioning `templates/` paths
- 004 has ~10 references: tasks, verification, file paths in details sections

Use `replace_all`-style edits per file — every `templates/` → `_templates/` within these two files. Preserve checkbox states (`[x]`) and verification content.

#### 7. Smoke test: run installer with --defaults in /tmp and verify _templates/ lands correctly

**Files:** none (filesystem + shell)

**Approach:** Run the smoke test from CLAUDE.md steps 1–3, adapted for this change:
1. `mkdir /tmp/spek-less-smoke-006 && cd /tmp/spek-less-smoke-006 && git init`
2. Run `install.sh --defaults`
3. Assert `.specs/_templates/` exists and contains all 5 `.tmpl` files
4. Assert `.specs/templates/` does NOT exist (old name is gone)
5. Assert no `{{PLACEHOLDER}}` strings remain in `.specs/config.yaml`
6. Clean up `/tmp/spek-less-smoke-006`

This catches missed references in the installer that would cause a silent failure on fresh installs.

#### 8. Rename dogfooding project's installed `.specs/templates/` → `.specs/_templates/`

**Files:** `.specs/templates/` → `.specs/_templates/`

**Approach:** This project dogfoods its own installer, so `.specs/templates/` was created by a previous install run. Simply `git mv .specs/templates/ .specs/_templates/`. No content changes inside the template files.

## Verification

**Task-by-task check:**
- Task 1 — Rename source directory: ✓ — `_templates/` exists with 5 `.tmpl` files; old `templates/` absent
- Task 2 — Update installer (`install.sh`): ✓ — 4 references updated (lines 13, 39, 42–43, 282); `grep` confirms no stale references
- Task 3 — Update skills + installed copies: ✓ — `skills/kickoff.md:90`, `skills/new.md:26`, `.claude/commands/spek/kickoff.md:90`, `.claude/commands/spek/new.md:26` all updated
- Task 4 — Update contributor docs: ✓ — `CLAUDE.md` (4 refs at lines 14, 73, 135, 152), `docs/architecture.md` (2 refs at lines 57, 226)
- Task 5 — Update user-facing docs: ✓ — `README.md:74` updated; line 325 is the general word "templates" (not a path reference), correctly left as-is
- Task 6 — Update completed feature specs: ✓ — `003` (~7 refs), `004` (~10 refs) all replaced; checkbox states preserved
- Task 7 — Smoke test: ✓ — execution log reports all assertions passed (temp dir cleaned up, can't re-verify directly, but diff confirms installer is correct)
- Task 8 — Rename dogfood dir: ✓ — `.specs/_templates/` exists with 5 files; `.specs/templates/` absent

**Principles check:**
- Single-agent topology: ✓ — no new agent roles
- Section ownership: ✓ — only Verification section rewritten
- The document is the state: ✓ — no state/lock/checkpoint files created
- Append-only execution log: ✓ — entries appended, not rewritten
- Idempotent on re-run: ✓ — one-shot renames are idempotent by nature
- No forced commits: ✓ — no commits made (changes still uncommitted in working tree)
- Principles-aware: ✓ — skills still read `principles.md`

**Goal check:** The goal was to rename `templates/` → `_templates/` and update every reference across the codebase. The `grep` for bare `templates/` (excluding `_templates/`) returns zero matches across all `.md`, `.sh`, `.tmpl`, and `.yaml` files. Both source `_templates/` and dogfood `.specs/_templates/` directories exist with all 5 `.tmpl` files. The old `templates/` directory is absent. The "Done when" criteria is fully satisfied.

**Issues found:** None.

**Status:** READY_TO_SHIP
