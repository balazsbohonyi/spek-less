---
id: "004"
title: Templates and Scaffolding
status: done
part_of: SpekLess
starting_sha:
created: 2026-04-07
tags: [templates, scaffolding]
---

# Templates and Scaffolding

## Context

> Part of [**SpekLess**](../project.md). See "Initial Feature Set" for one-line scope.

The five template files in `_templates/` that `install.sh` and the skills use to scaffold new feature docs and project config. Templates use `{{PLACEHOLDER}}` markers substituted by `sed` (installer) or inline string replacement (skills).

**Goal:** Every generated file looks correct out of the box — no stray placeholders, no broken formatting, helpful HTML comments as inline guidance for humans editing the resulting files.

**Templates:**
- `spec.md.tmpl` — skeleton feature spec with all sections + HTML comment guidance
- `execution.md.tmpl` — append-only execution log with format examples in comments
- `project.md.tmpl` — product vision doc with all sections + HTML comment guidance
- `config.yaml.tmpl` — per-project SpekLess configuration with inline documentation
- `principles.md.tmpl` — project principles with placeholder bullets for each category

**Placeholders in use:**
- `spec.md.tmpl`: `{{ID}}`, `{{TITLE}}`, `{{DATE}}`
- `execution.md.tmpl`: `{{TITLE}}`
- `project.md.tmpl`: `{{PROJECT_NAME}}`, `{{DATE}}`
- `config.yaml.tmpl`: `{{NAMESPACE}}`, `{{SPECS_ROOT}}`, `{{SUGGEST_COMMITS}}`, `{{SUBAGENT_THRESHOLD}}`, `{{PROJECT_HINTS}}`, `{{COMMIT_STYLE}}`

## Discussion

> **Retroactively adopted.**

Key decisions:
- **HTML comments as inline guidance** — comments disappear in rendered markdown, guiding human editors without polluting output. Not converted to visible text.
- **`|` as sed delimiter** — values containing `/` (common in paths) work safely; values containing `|` would break substitution (documented constraint).
- **Templates always overwritten on re-install** — user edits belong in the generated files under `.specs/`, not in `_templates/`. Latest templates always land on re-install.
- **`principles.md.tmpl` uses `<e.g., ...>` markers** — `/spek:kickoff` detects these to offer principles-building conversation.

## Plan

### Tasks

1. [x] `spec.md.tmpl` — skeleton feature spec with frontmatter, all sections, HTML comment guidance
2. [x] `execution.md.tmpl` — append-only log template with format examples in comments
3. [x] `project.md.tmpl` — product vision template with all 7 sections + Initial Feature Set list
4. [x] `config.yaml.tmpl` — config file with all 6 settings, inline documentation, `{{PLACEHOLDER}}` markers
5. [x] `principles.md.tmpl` — principles template with `<e.g., ...>` placeholder bullets for 5 categories

### Details

#### 1. `spec.md.tmpl`
**Files:** `_templates/spec.md.tmpl`
**Approach:** YAML frontmatter with `{{ID}}`, `{{TITLE}}`, `{{DATE}}`. Sections: Context, Discussion, Plan (with Tasks + Details subsections), Verification. Each section has HTML comment explaining who writes it.

#### 2. `execution.md.tmpl`
**Files:** `_templates/execution.md.tmpl`
**Approach:** Single `# Execution Log — {{TITLE}}` heading. HTML comment explains append-only format with example entries.

#### 3. `project.md.tmpl`
**Files:** `_templates/project.md.tmpl`
**Approach:** YAML frontmatter with `{{PROJECT_NAME}}`, `{{DATE}}`, `status: kickoff`. Sections: Problem, Vision, Users & Use Cases, Success Metrics, Scope (In/Out), Constraints, Initial Feature Set.

#### 4. `config.yaml.tmpl`
**Files:** `_templates/config.yaml.tmpl`
**Approach:** All 6 config keys with inline YAML comments explaining each. Placeholders for all user-configurable values. Sed-substituted by installer.

#### 5. `principles.md.tmpl`
**Files:** `_templates/principles.md.tmpl`
**Approach:** 5 sections (Code Style, Architecture, Testing, Documentation, Security), each with 2-3 `<e.g., ...>` placeholder bullets. HTML comment at top explains purpose and usage.

## Verification

**Task-by-task check:**
- Task 1 — `spec.md.tmpl`: ✓ — frontmatter has `{{ID}}`, `{{TITLE}}`, `{{DATE}}`; sections Context, Discussion, Plan (Tasks + Details), Verification all present with HTML comment ownership guidance (`_templates/spec.md.tmpl:1-71`)
- Task 2 — `execution.md.tmpl`: ✓ — `# Execution Log — {{TITLE}}` heading; HTML comment explains append-only format; example entries use `####` heading level (`_templates/execution.md.tmpl:1-26`)
- Task 3 — `project.md.tmpl`: ✓ — frontmatter has `{{PROJECT_NAME}}`, `{{DATE}}`, `status: kickoff`; all 7 sections present (Problem, Vision, Users & Use Cases, Success Metrics, Scope In/Out, Constraints, Initial Feature Set) with HTML comment guidance (`_templates/project.md.tmpl:1-70`)
- Task 4 — `config.yaml.tmpl`: ✓ — all 6 config keys with inline documentation; all 6 placeholders (`{{NAMESPACE}}`, `{{SPECS_ROOT}}`, `{{SUGGEST_COMMITS}}`, `{{SUBAGENT_THRESHOLD}}`, `{{PROJECT_HINTS}}`, `{{COMMIT_STYLE}}`) present (`_templates/config.yaml.tmpl:1-36`)
- Task 5 — `principles.md.tmpl`: ✓ — 5 sections (Code Style, Architecture, Testing, Documentation, Security) with 2-3 `<e.g., ...>` bullets each; HTML comment at top explains purpose and how to replace examples (`_templates/principles.md.tmpl:1-44`)

**Principles check:**
- HTML comments as inline guidance: ✓ — all 5 templates use HTML comments for guidance; none converted to visible text
- No secrets in templates: ✓ — no credentials or hardcoded values in any template
- `|` delimiter constraint: ✓ — no `|` characters in template content that would break `sed` substitution

**Goal check:** The goal was "every generated file looks correct out of the box — no stray placeholders, no broken formatting, helpful HTML comments as inline guidance for humans editing the resulting files." All 5 templates satisfy this. All `{{PLACEHOLDER}}` markers are intentional and substituted by `install.sh` or skills. All sections have HTML comments explaining who writes them and what to put there. No formatting issues observed.

**Issues found:** None.

**Status:** READY_TO_SHIP
