---
id: "003"
title: Installer
status: done
part_of: SpekLess
starting_sha:
created: 2026-04-07
tags: [installer, onboarding]
---

# Installer

## Context

> Part of [**SpekLess**](../project.md). See "Initial Feature Set" for one-line scope.

`install.sh` is the zero-dependency Bash script that sets up SpekLess in any git repo. It is the only distribution mechanism — there is no npm package, no binary, no plugin marketplace. A developer runs it once in a new project and SpekLess is ready.

**Goal:** A developer can install SpekLess in under 2 minutes by running a single Bash command. Pressing Enter at every prompt produces a correct working install. Re-running the installer is safe and preserves all existing config and feature specs.

**Constraints:**
- Zero non-POSIX dependencies (`sed`, `grep`, `awk`, `cp`, `mkdir` only)
- Must work on Windows under Git Bash with defensive path quoting
- Idempotent: re-run must never silently overwrite `.specs/config.yaml`, `principles.md`, or feature folders
- `--defaults` / `-y` flag for non-interactive scripted installs

**Success criteria:**
- `ls .specs/` shows `config.yaml`, `principles.md`, and `_templates/` after install
- `ls .claude/commands/spek/` shows all 10 skill files
- No `{{PLACEHOLDER}}` strings remain in generated `config.yaml`
- Re-running with existing config preserves all values

## Discussion

> **Retroactively adopted.** Design rationale in `CLAUDE.md` (Installer conventions section).

Key decisions:
- **`install.sh` copies `skills/*.md` generically** — no per-skill special-casing; adding a new skill just works
- **Templates dir is always overwritten on re-install** — gets latest framework templates; user edits belong in `.specs/`, not `_templates/`
- **Per-project config is sovereign** — if both per-project and global configs exist, per-project wins
- **`|` as sed delimiter** — avoids collisions with `/` in paths; values containing `|` would break substitution

## Plan

### Tasks

1. [x] Interactive prompt flow — ask namespace, specs_root, suggest_commits, subagent_threshold, project_hints, commit_style
2. [x] `--defaults` / `-y` flag — skip all prompts, skip summary confirmation, auto-run `git init` if needed
3. [x] Config generation — substitute placeholders in `config.yaml.tmpl` via sed, write to `.specs/config.yaml`
4. [x] Skills installation — copy `skills/*.md` to `.claude/commands/<namespace>/`
5. [x] Templates installation — copy `_templates/` to `.specs/_templates/` (always overwrite)
6. [x] Idempotent re-run — skip existing `config.yaml` and `principles.md`; read existing config for prompt defaults
7. [x] Windows / Git Bash compatibility — defensive quoting on all path variables

### Details

#### 1. Interactive prompt flow
**Files:** `install.sh`
**Approach:** Each prompt shows the default in brackets. `read -r` captures input; empty input uses default. Summary shown before writing any files.

#### 2. `--defaults` / `-y` flag
**Files:** `install.sh`
**Approach:** Parse `$1` at script start. If `--defaults` or `-y`, set `INTERACTIVE=false`. All prompts skip to their defaults. Git init runs automatically if not a git repo.

#### 3. Config generation
**Files:** `install.sh`, `_templates/config.yaml.tmpl`
**Approach:** `sed` substitution using `|` delimiter. Each placeholder replaced in sequence. Written to `$SPECS_ROOT/config.yaml`.

#### 4. Skills installation
**Files:** `install.sh`
**Approach:** `mkdir -p .claude/commands/$NAMESPACE/` then `cp skills/*.md` to that directory. Generic glob means new skills are picked up automatically.

#### 5. Templates installation
**Files:** `install.sh`
**Approach:** `cp -r _templates/ "$SPECS_ROOT/_templates/"` — always overwrite so re-installs get latest templates.

#### 6. Idempotent re-run
**Files:** `install.sh`
**Approach:** Check if `config.yaml` exists before writing. If it does, read current values as defaults for prompts rather than using hardcoded defaults.

#### 7. Windows / Git Bash compatibility
**Files:** `install.sh`
**Approach:** All path variables quoted with `"$VAR"`. No `NUL` device; use `/dev/null`. No Windows-specific path separators in generated files.

## Verification

**Task-by-task check:**
- Task 1 — Interactive prompt flow: ✓ — `install.sh:201-251` prompts all 6 fields (namespace, specs_root, suggest_commits, subagent_threshold, project_hints, commit_style) with defaults shown in brackets
- Task 2 — `--defaults` / `-y` flag: ✓ — `install.sh:29-32` parses flag; `ask()` and `ask_yn()` short-circuit to defaults when `USE_DEFAULTS=true`; git init runs unattended via `ask_yn`; summary confirmation skipped at line 266
- Task 3 — Config generation: ✓ — `write_config()` at `install.sh:335-346` substitutes all 6 placeholders via sed with `|` delimiter; all values run through `escape_sed` first
- Task 4 — Skills installation: ✓ — `install_skills_to()` at `install.sh:292-322` copies `skills/*.md` generically; supports per-project (scope 1), global (scope 2), or both (scope 3)
- Task 5 — Templates installation: ✓ — `install.sh:282-287` copies each `*.tmpl` file to `$SPECS_ROOT/_templates/` on every run (always overwrites); directory is created with `mkdir -p`
- Task 6 — Idempotent re-run: ✓ — detects existing config at `install.sh:149-161`; reads existing values as defaults at `install.sh:166-194`; skips writing `config.yaml` if present (`install.sh:349-355`); skips `principles.md` if present (`install.sh:372-381`)
- Task 7 — Windows / Git Bash compatibility: ✓ — all path variables quoted defensively throughout; `/dev/null` used (not NUL) at `install.sh:116`; no Windows path separators in generated output

**Principles check:**
- Code Style (skill file conventions): ✓ — not applicable to `install.sh` (not a skill file)
- Architecture (single-agent, no lockfiles): ✓ — installer is a standalone Bash script, no agent machinery
- Security (no `|` in sed values): ✓ — `escape_sed()` at `install.sh:104-111` escapes `\`, `&`, and `|` before substitution; the principle says "avoid or strip" — the implementation does better by escaping
- Zero non-POSIX dependencies: ✓ — only `bash`, `sed`, `grep`, `cp`, `mkdir`, `git` used

**Goal check:** The installer achieves its stated goal. A developer can run `install.sh`, press Enter at every prompt, and get a correct working install in under 2 minutes. All four success criteria are satisfied: `.specs/` contains `config.yaml`, `principles.md`, and `_templates/`; `.claude/commands/spek/` contains all skill files; no `{{PLACEHOLDER}}` strings remain (all 6 substituted); re-running with existing config preserves all values. One undocumented behavior: the installer also writes a `## SpekLess` block to `CLAUDE.md` (`install.sh:386-403`) — this is useful but not listed in the Plan. Not a bug, but the spec is incomplete.

**Issues found:**
- `install.sh:386-403` — installer writes a SpekLess block to `CLAUDE.md` with no corresponding Plan task. The behavior is correct and idempotent (skipped if block already present), but the spec omits it. Minor spec gap, not a code issue.

**Status:** READY_TO_SHIP
