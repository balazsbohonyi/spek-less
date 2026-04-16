---
id: 022
title: Cross-Agent Skill Rendering and Codex Packaging
status: done
part_of: SpekLess
starting_sha: 70ac557
created: 2026-04-16
tags: []
---

# Cross-Agent Skill Rendering and Codex Packaging

## Context

SpekLess was originally authored for Claude Code, then later ported to Codex and OpenCode. The source `skills/` directory remained Claude-shaped enough to work in Claude Code, but the installed Codex copies were still being written as flat `.md` files under `.codex/skills/`, which Codex CLI does not discover as skills. The result was that `$spek:new`-style usage never became available in Codex even though the repo claimed Codex support.

> Part of [**SpekLess**](../project.md).

The goal of this feature is to make cross-agent installation truthful and usable: keep one canonical source tree for skills and templates, render installed artifacts per target agent, package Codex skills in the directory-per-skill `SKILL.md` format Codex expects, and document the contributor rules so future skill additions stay compatible across Claude Code, Codex, and OpenCode.

Success means a developer can install SpekLess for Codex and immediately invoke `$spek-new`, `$spek-plan`, and the other rendered skills, while Claude Code and OpenCode keep their native `namespace:skill` command style. The Sync Rule and maintenance guidance must also describe this source-vs-rendered contract clearly enough that future edits do not regress Codex support.

## Discussion

The central decision is that `skills/` and `_templates/` remain canonical source, and installation becomes a render step rather than a raw copy. This avoids maintaining separate source trees for Claude Code, Codex, and OpenCode while still allowing each installed artifact to match the loader expectations of the selected agent.

Codex requires two differences that Claude Code and OpenCode do not: packaged skills at `.codex/skills/<name>/SKILL.md`, and hyphenated skill names rather than `namespace:skill` references. Rather than rewriting the source files globally into Codex form, the installer renders canonical `spek:<skill>` references to `{ns}:<skill>` for Claude/OpenCode and `{ns}-<skill>` for Codex. User-facing references continue to be authored with `{{CMD_PREFIX}}spek:<skill>` in source and are resolved during rendering.

The implementation also exposed a practical encoding pitfall: Codex rejects `SKILL.md` files whose YAML frontmatter is preceded by a UTF-8 BOM. This happened during a manual repair path, not from the canonical source skills. The repo therefore needs explicit maintainer guidance that Codex `SKILL.md` files must be UTF-8 without BOM when they are ever repaired or synced manually.

Finally, `_templates/` need to follow the same render rules as installed skills. Even though templates are shared framework assets rather than agent packages, they still contain command references and comments that should reflect the selected namespace/agent in generated files. Leaving them as raw copies would reintroduce drift between what users read and what their chosen agent can invoke.

## Assumptions

- [ ] Codex CLI discovers only directory-packaged skills with `SKILL.md`, not flat `.md` files in `.codex/skills/`. <!-- unverifiable: this repository shows the packaged Codex output shape, but the loader behavior itself is external to the repo -->
- [ ] Claude Code and OpenCode continue to support the `namespace:skill` command form and do not require Codex-style packaging. <!-- unverifiable: this is external product behavior, not something the repository can prove on its own -->
- [x] The canonical source form `spek:<skill>` is stable enough to use as a render token in both skills and templates.
- [ ] Updating contributor docs is sufficient to prevent future regressions in manual sync and new-skill authoring. <!-- unverifiable: documentation can reduce regressions, but sufficiency cannot be proven from the current tree -->

## Plan

### Tasks

1. [x] Refactor installer rendering to support agent-specific skill output and namespace rewriting.
2. [x] Add Codex package generation and cleanup for legacy flat installs.
3. [x] Render templates and generated config comments with the selected namespace and agent conventions.
4. [x] Update contributor-facing rules for source-vs-rendered skills and Codex package constraints.
5. [x] Update user-facing docs to describe Codex packaging and invocation accurately.
6. [x] Verify rendered outputs, fix local Codex packaging issues, and capture the work in a reference plan document.

### Details

#### 1. Refactor installer rendering to support agent-specific skill output and namespace rewriting

**Files:** `install.js`

**Approach:** Introduce a render layer that treats canonical source `spek:<skill>` references as tokens rather than literal installed names. Add helpers for rendered skill references and commands, then apply those helpers when summarizing install choices, rendering skill bodies, and writing installed artifacts.

#### 2. Add Codex package generation and cleanup for legacy flat installs

**Files:** `install.js`, `.codex/skills/*`

**Approach:** Change the Codex install path from flat file copies to `.codex/skills/{ns}-<skill>/SKILL.md`. During reinstall, remove stale packaged directories and clean up legacy flat `*.md` files left by older installs. Confirm the repo-local `.codex/skills` tree is migrated to the new packaged shape.

#### 3. Render templates and generated config comments with the selected namespace and agent conventions

**Files:** `install.js`, `_templates/*.tmpl`, `.specs/_templates/*.tmpl`, `.specs/config.yaml`

**Approach:** Stop copying templates byte-for-byte. Render canonical `spek:<skill>` references inside template content and generated config comments so produced files match the selected namespace and agent conventions. Preserve placeholder substitution behavior and stale-template cleanup.

#### 4. Update contributor-facing rules for source-vs-rendered skills and Codex package constraints

**Files:** `.specs/principles.md`, `docs/maintenance.md`

**Approach:** Document that `skills/` is canonical source, agent-specific installs are derived artifacts, Codex packages must be generated rather than hand-authored, and manual Codex `SKILL.md` writes must use UTF-8 without BOM so YAML frontmatter remains valid.

#### 5. Update user-facing docs to describe Codex packaging and invocation accurately

**Files:** `README.md`, `docs/architecture.md`

**Approach:** Replace raw-copy and flat `.codex/skills/` assumptions with the real package layout, add Codex trigger examples like `$spek-new`, and explain that Claude/OpenCode keep `namespace:skill` while Codex uses packaged hyphenated names.

#### 6. Verify rendered outputs, fix local Codex packaging issues, and capture the work in a reference plan document

**Files:** `docs/cross-agent-skill-rendering-plan.md`, `.claude/commands/spek/*`, `.codex/skills/*`

**Approach:** Run targeted installer verification, ensure no unresolved `{{CMD_PREFIX}}` placeholders remain in installed copies, confirm Codex package shape in generated output, repair the repo-local Codex install, remove BOM from local `SKILL.md` files after discovery of the loader issue, and save the implementation plan under `docs/` for future reference.

## Verification

**Task-by-task check:**
- Task 1 - Refactor installer rendering to support agent-specific skill output and namespace rewriting: ✓ - `install.js:146`, `install.js:152`, `install.js:156`, `install.js:162`, and `install.js:166` add the render helpers, and `install.js:318`, `install.js:329`, `install.js:342`, and `install.js:383` apply them in the interactive flow.
- Task 2 - Add Codex package generation and cleanup for legacy flat installs: ✓ - `install.js:481`, `install.js:487`, `install.js:501`, `install.js:510`, and `install.js:511` package Codex skills as `.codex/skills/{ns}-<skill>/SKILL.md` and clean stale installs; the repo-local `.codex/skills/` tree contains packaged directories only.
- Task 3 - Render templates and generated config comments with the selected namespace and agent conventions: ✓ - `install.js:460`, `install.js:548`, and `install.js:555` render templates and generated config content, and the wording is now agent-neutral in `_templates/config.yaml.tmpl:5`, `.specs/_templates/config.yaml.tmpl:5`, and `.specs/config.yaml:5`.
- Task 4 - Update contributor-facing rules for source-vs-rendered skills and Codex package constraints: ✓ - `.specs/principles.md:52`, `.specs/principles.md:54`, `.specs/principles.md:63`, `.specs/principles.md:67`, and `.specs/principles.md:71` define the rendered-install contract and no-BOM rule, and `docs/maintenance.md:40`, `docs/maintenance.md:42`, `docs/maintenance.md:46`, `docs/maintenance.md:58`, and `docs/maintenance.md:103` align contributor guidance with that model.
- Task 5 - Update user-facing docs to describe Codex packaging and invocation accurately: ✓ - `README.md:7`, `README.md:64`, `README.md:84`, and `README.md:301` document the three-agent install story and Codex command form, and `docs/architecture.md:84` and `docs/architecture.md:87` describe packaged Codex installs and render-time name conversion.
- Task 6 - Verify rendered outputs, fix local Codex packaging issues, and capture the work in a reference plan document: ✓ - `docs/cross-agent-skill-rendering-plan.md:1` and `docs/cross-agent-skill-rendering-plan.md:66` capture the implementation and test plan, while `.specs/022_cross-agent-skill-rendering-and-codex/execution.md:18`, `.specs/022_cross-agent-skill-rendering-and-codex/execution.md:23`, `.specs/022_cross-agent-skill-rendering-and-codex/execution.md:25`, and `.specs/022_cross-agent-skill-rendering-and-codex/execution.md:28` record the smoke-test and Codex package verification evidence.

**Principles check:**
- Code Style: ✓ - source skills remain canonical while agent-specific installs are derived artifacts, matching `.specs/principles.md:16`, `.specs/principles.md:17`, and `docs/maintenance.md:40`.
- Architecture: ✓ - the change stays within install-time rendering and preserves section ownership and document-as-state invariants; see `.specs/principles.md:23`, `.specs/principles.md:24`, `.specs/principles.md:25`, and `install.js:481`.
- Testing: ✓ - the smoke-test expectation in `.specs/principles.md:30` and `.specs/principles.md:31` is now backed by `.specs/022_cross-agent-skill-rendering-and-codex/execution.md:19` through `.specs/022_cross-agent-skill-rendering-and-codex/execution.md:26`.
- Documentation: ✓ - the contributor and user docs were updated together in line with `.specs/principles.md:35` through `.specs/principles.md:38`; see `README.md:7`, `docs/architecture.md:87`, and `docs/maintenance.md:40`.
- Sync Rule: ✓ - `.specs/principles.md:52` through `.specs/principles.md:59` define rendered sync, and `install.js:460`, `install.js:481`, and `install.js:555` implement it for templates, skills, and config output.
- Command References: ✓ - `.specs/principles.md:63` through `.specs/principles.md:72` define canonical `spek:<skill>` source tokens plus rendered user-facing commands, and `install.js:156` through `install.js:168` enforce that conversion.
- Security: ✓ - no secrets handling changed, and config/template rendering still uses direct string replacement via `install.js:548` through `install.js:555`, consistent with `.specs/principles.md:76` and `.specs/principles.md:77`.

**Assumptions check:**
- Codex CLI discovers only directory-packaged skills with `SKILL.md`, not flat `.md` files in `.codex/skills/`: ⚠ unverifiable - the repository reflects that packaging strategy, but the CLI discovery rule itself is external.
- Claude Code and OpenCode continue to support the `namespace:skill` command form and do not require Codex-style packaging: ⚠ unverifiable - external product behavior.
- The canonical source form `spek:<skill>` is stable enough to use as a render token in both skills and templates: ✓ confirmed - `install.js:156` through `install.js:168`, `docs/maintenance.md:46` through `docs/maintenance.md:68`, and `.specs/principles.md:63` through `.specs/principles.md:66` all use that source-token contract consistently.
- Updating contributor docs is sufficient to prevent future regressions in manual sync and new-skill authoring: ⚠ unverifiable - the docs now exist, but their sufficiency cannot be demonstrated from current files alone.

**Goal check:** The implementation achieves the stated goal. SpekLess now keeps one canonical source tree, renders installed artifacts per target agent, packages Codex skills in the directory-per-skill `SKILL.md` shape described by the feature, and documents that source-vs-rendered contract in both contributor and user-facing docs. The prior gaps around Codex-facing config wording and missing verification evidence are closed by the current config template text and the newly recorded smoke-test evidence in `execution.md`.

**Issues found:**
None.

**Status:** READY_TO_SHIP
