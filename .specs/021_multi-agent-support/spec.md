---
id: 021
title: Multi-agent support
status: done
part_of: SpekLess
starting_sha: 00d9588
created: 2026-04-15
tags: []
---

# Multi-agent support

## Context

SpekLess is currently built exclusively for Claude Code, where skills are invoked as `/spek:X`. Two ports are planned: Codex CLI (`$spek:X`) and OpenCode (prefix TBD). This creates a portability problem: all 12 skill files contain ~116 hardcoded `/spek:X` references, and the installer hardcodes Claude Code's `.claude/commands/{namespace}/` directory structure.

Two categories of references exist:
- **Type A — internal guidance** (frontmatter descriptions, behavior rules, section headers): read by the AI agent only, never shown verbatim to the user. These can safely use bare `spek:X` with no prefix.
- **Type B — user-facing output** ("Next step: run /spek:discuss"): the only place the prefix matters to the user. These use `{{CMD_PREFIX}}spek:X` placeholders in the source files; the installer substitutes the correct prefix per agent on copy.

**Done looks like:** All 12 skill files use bare `spek:X` for internal refs; user-facing output sections use `{{CMD_PREFIX}}spek:X` placeholders that the installer substitutes with the correct prefix (e.g. `/` for Claude Code/OpenCode, `$` for Codex) when copying skills to each agent's directory. The installer asks which AI agent is being used, routes skills to the correct per-agent directory, and applies the prefix substitution on write. `principles.md` documents the platform-neutral rule and the template-time bake convention. No `/spek:X` patterns remain in `skills/`; no runtime `cmd_prefix` read in any skill; no block injection into `CLAUDE.md`/`AGENTS.md`.

## Discussion

_Imported from [docs/multi-agent-support-plan.md] on 2026-04-15._

**Approach chosen:** Inline config lookup — every skill already reads `config.yaml`; adding `cmd_prefix` there is the minimal, zero-dependency solution. No new files, no new infrastructure.

**Two alternative approaches considered:**
1. Environment variable injection at install time — rejected because it requires shell env to be set on every session, fragile on Windows.
2. Template-time substitution (bake the prefix into installed skill files) — initially rejected because it means re-running the installer to change agent, and diverges the installed files from `skills/` source. **Reversed in task 11** — the objection proved moot once multi-agent installs were in scope: installed copies already live in separate per-agent directories, so the divergence is intentional and minimal (same pattern as `spekless-block.md.tmpl`). This became the delivered approach.

**Agent → directory mapping:**
| ai_agent | Project-local | Global |
|---|---|---|
| claude_code | `.claude/commands/{ns}/` | `~/.claude/commands/{ns}/` |
| codex | `.codex/skills/` | `~/.codex/skills/` |
| opencode | `.opencode/commands/{ns}` | `~/.config/opencode/commands/{ns}` |

The namespace subfolder (`{ns}`) applies to Claude Code and OpenCode only — Codex install skills directly into the target directory.

**GitHub Copilot:** explicitly out of scope.

## Assumptions

- [x] `opencode`'s cmd_prefix is `/` — the same as `claude_code`.
- [x] OpenCode uses namespace subfolders in skill directories (same as Claude Code). Codex does not — skills go directly into the target directory.
- [x] All 12 skill files will be modified; no skill is exempt from the Type A strip.
- [x] `.specs/` execution logs are not touched — they are historical records, not installed content.
- [x] `README.md` and `CLAUDE.md` (SpekLess's own docs) are not touched — they are Claude Code–flavored and intentionally so.
- [x] The `skills/` directory remains the single source of truth; installed copies in `.claude/commands/spek/` are derived via the Sync Rule.

## Plan

### Tasks

1. [x] Add `ai_agent` and `cmd_prefix` fields to `_templates/config.yaml.tmpl`
2. [x] Update `_templates/spekless-block.md.tmpl` with `{{SKILLS_DIR}}` and `{{CMD_PREFIX}}` placeholders
3. [x] Update `install.js` — agent question, directory routing, target file selection, `renderConfig` substitutions, done output
4. [x] Strip `/` from Type A references in all `skills/*.md` files (12 files)
5. [x] Add `cmd_prefix` read and prepend instruction to user-facing output sections in `skills/*.md`
6. [x] Update `.specs/principles.md` — agent-aware Sync Rule table and new Command References section
7. [x] Strip `/` from Type A references in `_templates/spec.md.tmpl` and other affected templates (~5 files, ~11 occurrences)
8. [x] Update `docs/maintenance.md` and `docs/architecture.md`
9. [x] Strip `/` from Type A references in `examples/` (~7 occurrences across 2 files)
10. [x] Sync `skills/` changes to `.claude/commands/spek/` (per updated Sync Rule)
11. [x] Replace runtime `cmd_prefix` read with template-time bake — `skills/*.md` + `install.js`
12. [x] Remove `ai_agent` and `cmd_prefix` from `config.yaml.tmpl` and `install.js`
13. [x] Fix `install.js` — always overwrite config.yaml on re-run
14. [x] Remove SpekLess block injection from `install.js` and delete `_templates/spekless-block.md.tmpl`
15. [x] Remove `project_hints` from installer, `config.yaml.tmpl`, and skills
16. [x] Update `.specs/principles.md` — Sync Rule note for prefix substitution
17. [x] Update `docs/architecture.md` and `docs/maintenance.md`
18. [x] Sync updated skills to `.claude/commands/spek/` with correct prefix substitution
19. [x] Fix stale idempotency banner in `install.js`
20. [x] Delete `.specs/_templates/spekless-block.md.tmpl` — remove stale installed template copy
21. [x] `install.js` — purge stale skill files from dest before re-installing
22. [x] `install.js` — purge stale template files from `.specs/_templates/` before re-copying
23. [x] Update `principles.md` Sync Rule — human-readable agent names, add deletion handling
24. [x] Update `docs/architecture.md`, `docs/maintenance.md`, and `CLAUDE.md` — replace `ai_agent`/`claude_code` with readable names
25. [x] Update `install.js` — fix stale `ai_agent` comment

### Details

#### 11. Replace runtime `cmd_prefix` read with template-time bake

**Files:** `skills/*.md` (12 files), `install.js`

**Approach:** The current mechanism reads `cmd_prefix` from `config.yaml` at runtime and prepends it to skill names in output. This is broken for multi-agent projects: `config.yaml` has one `ai_agent` value (set by the last installer run), but all three agents may have skills installed simultaneously — each in their own directory, each needing a different prefix.

The fix mirrors how `_templates/spekless-block.md.tmpl` already works: the template contains `{{CMD_PREFIX}}{{NAMESPACE}}:X` literals, and the installer substitutes them on write. Skills should do the same.

**Skills changes (12 files):**
- Remove the "Prepend `cmd_prefix` (from config.yaml) to all skill names in user-facing output" instruction from the `## Output to user` section of each skill.
- Remove `cmd_prefix` from the Reads bullet (the AI no longer needs to read it at runtime). The config.yaml Reads bullet reverts to listing only `specs_root`, `project_hints`, `subagent_threshold`, `namespace`.
- In `## Output to user` sections, change bare `spek:X` references back to `{{CMD_PREFIX}}spek:X`. These are placeholders — the installer will substitute them during the copy step (task 18), so the installed file contains the correct hardcoded prefix (`/spek:X` or `$spek:X`).

**`install.js` change:**
- Change `installSkillsTo(dest)` to `installSkillsTo(dest, prefix)`.
- Inside the loop, instead of `copyFileSafe(src, dest)`, read the source file content, apply `.replace(/\{\{CMD_PREFIX\}\}/g, prefix)`, then write to destination.
- Pass `cmdPrefix` as the second argument at both call sites (lines 465 and 469).

**Note on Discussion override:** The original Discussion in this spec rejected template-time bake because "it diverges the installed files from `skills/` source." That objection is moot here: installed copies are already in different directories per agent, and the divergence (substituted prefix) is intentional and minimal — identical to how `spekless-block.md.tmpl` is handled.

#### 12. Remove `ai_agent` and `cmd_prefix` from `config.yaml.tmpl` and `install.js`

**Files:** `_templates/config.yaml.tmpl`, `install.js`

**Approach:** Task 1 added `ai_agent: {{AI_AGENT}}` and `cmd_prefix: {{CMD_PREFIX}}` fields to `config.yaml.tmpl`. With template-time bake, skills no longer read either field at runtime. `ai_agent` was only ever used by the installer to set a re-run default — but in a multi-agent project there's no single correct value, and re-running users are responsible for specifying their target agent. Remove both fields from the template.

In `install.js`:
- Remove the `defaultAiAgent` read from `collectConfig()` (line 266). The agent question always defaults to option 1 (Claude Code).
- Remove `.replace(/\{\{AI_AGENT\}\}/g, aiAgent)` and `.replace(/\{\{CMD_PREFIX\}\}/g, cmdPrefix)` from `renderConfig()`.

#### 13. Fix `install.js` — always overwrite config.yaml on re-run

**Files:** `install.js`

**Approach:** Remove the preserve guards at lines 492-493 and 501-502. `collectConfig()` already reads all existing values as defaults before asking questions, so the rendered output reflects the user's current choices. Change both `if (fs.existsSync(...)) { log "Preserving..." } else { write }` blocks to unconditionally call `writeFileSafe(...)`.

#### 14. Remove SpekLess block injection from `install.js` and delete `_templates/spekless-block.md.tmpl`

**Files:** `install.js`, `_templates/spekless-block.md.tmpl`, `CLAUDE.md`

**Approach:** The installer appends a `## SpekLess` block to `CLAUDE.md` or `AGENTS.md` after installation. This is redundant — the skills themselves encode all the workflow knowledge, and skilled users don't need a rendered block in their project docs to know how to invoke SpekLess.

Three changes:
- **Delete `_templates/spekless-block.md.tmpl`** — the template source file.
- **Remove the block injection from `install.js`** — the section at lines 522–538: `targetFile` computation, `speklessBlock` render, existence check, and `writeFileSafe` call. Also remove `.replace(/\{\{SKILLS_DIR\}\}/g, skillsDirDisplay)` from `renderConfig()` since it was only used for this template substitution.
- **Remove the `## SpekLess` block from this project's own `CLAUDE.md`** — the rendered instance that was injected when the installer was run on the SpekLess repo itself.

Note: task 2 added `{{SKILLS_DIR}}` and `{{CMD_PREFIX}}` to `spekless-block.md.tmpl`. Those changes go away with the file deletion — no separate revert needed.

#### 15. Remove `project_hints` from installer, `config.yaml.tmpl`, and skills

**Files:** `install.js`, `_templates/config.yaml.tmpl`, `skills/*.md` (12 files)

**Approach:** Remove `project_hints` entirely — from the installer, the config template, and every skill that reads it.

`install.js`:
- Remove the `defaultProjectHints` read from `collectConfig()` (line 267).
- Remove the interactive prompt at lines 296–298.
- Remove `.replace(/\{\{PROJECT_HINTS\}\}/g, projectHints)` from `renderConfig()`.

`_templates/config.yaml.tmpl`:
- Remove the `project_hints:` field and its surrounding comments entirely.

`skills/*.md` (12 files):
- Remove `project_hints` from the `config.yaml` Reads bullet of each skill. The Reads bullet reverts to listing only `specs_root`, `subagent_threshold`, `namespace` (and no longer `cmd_prefix` either, per task 11).

**Dependency:** task 11 also edits all 12 skill files. Complete task 11 first, then apply the `project_hints` Reads removal here as a second pass over the same files.

#### 16. Update `.specs/principles.md` — Sync Rule and Command References

**Files:** `.specs/principles.md`

**Approach:** Two sections need updating.

**Sync Rule:**
- Add a note that sync is not a raw copy: when syncing `skills/` changes to installed directories, apply `{{CMD_PREFIX}}` substitution with the correct prefix for each agent's directory (same substitution that `installSkillsTo` performs). This prevents a developer copying `skills/new.md` verbatim and leaving `{{CMD_PREFIX}}spek:X` literals in the installed file.
- Remove the "When adding a new skill, also update `_templates/spekless-block.md.tmpl`" paragraph — that template is deleted in task 14 and the note is stale.

**Command References:**
- Replace the two current bullets with the template-time bake rule. New wording:
  - Skill source files (`skills/*.md`) use `{{CMD_PREFIX}}spek:X` in `## Output to user` sections — never a hardcoded prefix. The installer substitutes the correct prefix per agent when copying skills to their target directory.
  - Internal guidance (frontmatter descriptions, behavior rules, section headers) uses bare `spek:X` — the prefix is irrelevant there.
  - When authoring a new skill, use `{{CMD_PREFIX}}spek:X` in every user-facing reference (output text, AskUserQuestion prompts). Do not read `cmd_prefix` from `config.yaml` at runtime.

#### 17. Update `docs/architecture.md` and `docs/maintenance.md`

**Files:** `docs/architecture.md`, `docs/maintenance.md`

**Approach:** Cascade the design changes from tasks 11–16 into the contributor docs.

`docs/architecture.md`:
- Remove `ai_agent`, `cmd_prefix`, and `project_hints` rows from the `config.yaml` fields table (lines ~77–80).
- Remove or rewrite the "Target doc" paragraph about writing the SpekLess block to `CLAUDE.md`/`AGENTS.md` (line ~90) — installation no longer writes this block.
- Remove `spekless-block.md.tmpl` from the repository file tree (line ~264).

`docs/maintenance.md`:
- **Platform command prefix note** (line 44): Update to describe template-time bake — skills use `{{CMD_PREFIX}}spek:X` placeholders in `## Output to user` sections; the installer substitutes the prefix on copy. Remove the instruction to add `cmd_prefix` to a skill's Reads bullet and to read it at runtime.
- **Template file conventions placeholder list** (lines 58–59): Remove `{{AI_AGENT}}` and `{{CMD_PREFIX}}` from the `config.yaml.tmpl` entry; remove the `spekless-block.md.tmpl` entry entirely.
- **Installer conventions** (line 71): Update the idempotency bullet — `config.yaml` is now always overwritten on re-run (task 13). The preserve-on-exists guarantee now applies only to `principles.md` and feature folders.

#### 18. Sync updated skills to `.claude/commands/spek/` with correct prefix substitution

**Files:** `.claude/commands/spek/*.md` (12 files)

**Approach:** After task 11 is complete (the source `skills/*.md` files carry `{{CMD_PREFIX}}spek:X` placeholders), copy all 12 updated skill files from `skills/` to `.claude/commands/spek/`, applying `{{CMD_PREFIX}}` → `/` substitution (this project uses `claude_code`). Verify the installed copies contain `/spek:X` in user-facing output sections and bare `spek:X` in internal guidance. Grep confirms zero `{{CMD_PREFIX}}` literals remain in the installed copies.

#### 19. Fix stale idempotency banner in `install.js`

**Files:** `install.js`

**Background:** Task 13 changed `config.yaml` to be always overwritten on re-run (not preserved). Task 14 removed `CLAUDE.md`/`AGENTS.md` block injection entirely. The user-facing banner at lines 598–600 still says "will preserve your features and config, only patching anything missing" — both claims are wrong:
- "preserve your config" is wrong: `config.yaml` is always overwritten (existing values become prompt defaults, but the file is regenerated).
- "only patching anything missing" is wrong: skills, templates, and `config.yaml` are always written; only `.specs/*/` feature folders and `principles.md` are preserved.

**Approach:** Rewrite the three-line banner to accurately describe what is preserved vs. regenerated:

```
'This installer is idempotent — re-running on a project that already has',
'SpekLess installed will preserve your existing features and principles.md.',
'config.yaml is always regenerated (existing values shown as defaults).',
```

#### 20. Delete `.specs/_templates/spekless-block.md.tmpl`

**Files:** `.specs/_templates/spekless-block.md.tmpl`

**Approach:** `_templates/spekless-block.md.tmpl` was deleted from source in task 14, but the installed copy at `.specs/_templates/spekless-block.md.tmpl` was never cleaned up (the Sync Rule at the time did not cover deletions). Delete the file directly. This is an immediate one-off fix; tasks 21–22 make the installer handle this class of issue automatically going forward.

#### 21. `install.js` — purge stale skill files from dest before re-installing

**Files:** `install.js`

**Approach:** Inside `installSkillsTo(dest, prefix)`, before the copy loop, check if `dest` already exists. If it does, enumerate its `.md` files, compute which ones are no longer present in `skillsSrc`, and delete them. This ensures that a skill deleted from `skills/` is also removed from every installed copy on the next `node install.js` run.

Concrete steps:
1. After `mkdirSafe(dest)`, use `fs.existsSync(dest)` and `fs.readdirSync(dest)` to get the current set of `.md` files in dest.
2. Build the set of source skill filenames from `fs.readdirSync(skillsSrc).filter(f => f.endsWith('.md'))`.
3. For each dest `.md` file not in the source set, call `fs.unlinkSync(path.join(dest, f))`.
4. Then proceed with the existing copy loop unchanged.

**Principles check:** idempotent — running again when already clean is a no-op.

#### 22. `install.js` — purge stale template files from `.specs/_templates/` before re-copying

**Files:** `install.js`

**Approach:** Same pattern as task 21 but applied to the templates copy step (section `(b)` of `runInstall`). Before the `for (const f of tmplFiles)` copy loop, enumerate `.tmpl` files already present in `templatesDest`. Delete any that are not in the source `tmplFiles` set. This makes a future template deletion (like `spekless-block.md.tmpl`) propagate to `.specs/_templates/` automatically on re-install.

Concrete steps:
1. After `mkdirSafe(templatesDest)`, get the current `.tmpl` files in `templatesDest` (only if the dir exists).
2. For each existing `.tmpl` not in `tmplFiles` (the source list), delete it.
3. Proceed with the existing copy loop unchanged.

#### 23. Update `principles.md` Sync Rule — human-readable agent names, add deletion handling

**Files:** `.specs/principles.md`

**Approach:** Two changes to the Sync Rule section:

1. **Replace the `ai_agent` column with human-readable agent names.** The current table uses `ai_agent` as the column header and `claude_code`/`codex`/`opencode` as row identifiers (internal installer token names, not product names). Replace the header with "AI Agent" and the identifiers with "Claude Code", "Codex", and "OpenCode" respectively.

2. **Add deletion handling guidance.** After the existing note about checking path existence before copying, add a sentence: when a file is deleted from `skills/` or `_templates/`, also delete the corresponding installed copy from every path that exists.

The new Sync Rule also needs to note that the installer (`node install.js`) handles both concerns automatically on re-run as of tasks 21–22.

#### 24. Update `docs/architecture.md`, `docs/maintenance.md`, and `CLAUDE.md` — readable agent names

**Files:** `docs/architecture.md`, `docs/maintenance.md`, `CLAUDE.md`

**Approach:**

`docs/architecture.md` (line ~81): The agent→directory table uses `| ai_agent |` as the column header and `claude_code`/`codex`/`opencode` as identifiers. Replace with `| AI Agent |` header and "Claude Code", "Codex", "OpenCode" as row labels (matching the principles.md fix in task 23).

`docs/maintenance.md` (line 133): The smoke test `ls` command comment says `# claude_code default; codex → ...; opencode → ...`. Replace `claude_code` with `Claude Code` to be consistent.

`CLAUDE.md` (line 141): The commit convention example reads `installer: route skills to correct directory per ai_agent`. Update to a more accurate example that doesn't reference the removed `ai_agent` concept, e.g. `installer: route skills to correct agent directory`.

#### 25. Update `install.js` — fix stale `ai_agent` comment

**Files:** `install.js`

**Approach:** Line 419 has `// (c) Install skills — directory depends on ai_agent`. The `ai_agent` internal token no longer appears in any user-visible output or config field; the comment is a historical artifact. Replace with `// (c) Install skills — directory and prefix depend on the chosen AI agent`.

## Verification

<!--
Written by /spek:verify. Fully rewritten on re-run.
-->

**Task-by-task check:**
- Task 1 — Add ai_agent/cmd_prefix to config.yaml.tmpl: ✓ — added per plan, then correctly removed in task 12; neither field in final template
- Task 2 — Update spekless-block.md.tmpl: ✓ — added per plan, then correctly deleted in task 14; `_templates/` contains no `spekless-block.md.tmpl`
- Task 3 — Update install.js: ✓ — `askChoice()` at install.js:207; agent question after commit style; `agentPerProjectDir`/`agentGlobalDir` functions at install.js:430–440; `installSkillsTo(dest, prefix)` reads source + applies `{{CMD_PREFIX}}` substitution; `cmdPrefix` computed in-memory from agent choice, never from config.yaml
- Task 4 — Strip `/spek:` from Type A references in skills/*.md: ✓ — 0 `/spek:` in all 12 skill source files
- Task 5 — Add cmd_prefix runtime read/prepend: ✓ — added per plan, then correctly superseded by template-time bake in task 11; 0 `cmd_prefix` in any skill Reads bullet
- Task 6 — Update .specs/principles.md (initial): ✓ — Sync Rule replaced with agent-aware directory table; Command References section added
- Task 7 — Strip `/spek:` from templates: ✓ — 0 `/spek:` in all 5 remaining template files; `spekless-block.md.tmpl` deleted
- Task 8 — Update docs (initial): ✓ — Platform command prefix note in maintenance.md; config fields table + agent→directory mapping in architecture.md
- Task 9 — Strip `/spek:` from examples/: ✓ — 0 `/spek:` in both example files
- Task 10 — Initial sync: ✓ — superseded by task 18
- Task 11 — Replace runtime cmd_prefix with template-time bake: ✓ — `{{CMD_PREFIX}}spek:X` confirmed in all 12 skill Output to user sections; `installSkillsTo` reads source, applies `.replace(/\{\{CMD_PREFIX\}\}/g, prefix)`, writes rendered content to dest; 0 `cmd_prefix` in any skill Reads
- Task 12 — Remove ai_agent/cmd_prefix from config.yaml.tmpl: ✓ — neither field present; no `{{AI_AGENT}}`, `{{CMD_PREFIX}}`, or `{{SKILLS_DIR}}` placeholders in `_templates/config.yaml.tmpl`
- Task 13 — Always overwrite config.yaml on re-run: ✓ — preserve guards removed; both per-project and global config paths call `writeFileSafe` unconditionally
- Task 14 — Remove SpekLess block injection + delete spekless-block.md.tmpl: ✓ — block injection section removed from install.js; `_templates/spekless-block.md.tmpl` deleted; `## SpekLess` block removed from CLAUDE.md
- Task 15 — Remove project_hints: ✓ — removed from `_templates/config.yaml.tmpl`, install.js, and all 12 skill Reads bullets; 0 `project_hints` in skills/, installed copies, or templates
- Task 16 — Update principles.md Sync Rule + Command References: ✓ — "Sync is not a raw copy" note with `{{CMD_PREFIX}}` substitution rule present; Command References section describes template-time bake rule
- Task 17 — Update docs/architecture.md and docs/maintenance.md: ✓ — config fields table has only `namespace`, `specs_root`, `suggest_commits`, `subagent_threshold`, `commit_style`; `spekless-block.md.tmpl` absent from file tree; maintenance.md idempotency bullet states "config.yaml is always overwritten"; placeholder list has no stale entries
- Task 18 — Sync updated skills to .claude/commands/spek/ with prefix substitution: ✓ — 0 `{{CMD_PREFIX}}` literals in installed copies; 29 `/spek:X` occurrences confirmed across all 12 files (substitution correctly applied)
- Task 19 — Fix stale idempotency banner in install.js: ✓ — install.js:611–614 reads "will preserve your existing features and principles.md. config.yaml is always regenerated (existing values shown as defaults)."
- Task 20 — Delete .specs/_templates/spekless-block.md.tmpl: ✓ — confirmed absent from `.specs/_templates/`; five expected templates present
- Task 21 — install.js purge stale skill files: ✓ — stale-file purge loop present in `installSkillsTo` before copy loop; reads dest `.md` files, builds source Set, deletes any dest files not in source
- Task 22 — install.js purge stale template files: ✓ — stale-file purge loop present in section (b) of `runInstall` before template copy loop; same pattern as task 21
- Task 23 — Update principles.md Sync Rule — human-readable names + deletion handling: ✓ — table uses "Claude Code"/"Codex"/"OpenCode"; deletion handling sentence + `node install.js` note present
- Task 24 — Update docs readable agent names: ✓ — architecture.md table uses "Claude Code"/"Codex"/"OpenCode"; maintenance.md smoke test comment updated; CLAUDE.md commit example updated to "correct agent directory"
- Task 25 — Fix stale ai_agent comment in install.js: ✓ — install.js:426 reads `// (c) Install skills — directory and prefix depend on the chosen AI agent`

**Principles check:**
- Single-agent topology: ✓ — no new agent roles introduced
- Section ownership: ✓ — unchanged; each skill owns same sections
- Document is the state: ✓ — no STATE.md or checkpoint files added
- Append-only execution log: ✓ — execution.md entries appended, never rewritten
- Skill files idempotent: ✓ — re-running any skill produces correct output from current on-disk state
- No forced commits: ✓ — no automatic git commit in installer or skills
- Principles-aware: ✓ — principles.md updated; no skill dropped its principles.md read
- Section-scoped reads: ✓ — no bulk reads added to any skill
- Sync Rule: ✓ — installed `.claude/commands/spek/` copies have `/spek:X` in Output to user sections; substitution correctly applied; 0 `{{CMD_PREFIX}}` literals

**Assumptions check:**
- `opencode`'s cmd_prefix is `/`: ✓ confirmed — `cmdPrefix = aiAgent === 'codex' ? '$' : '/'` in install.js
- OpenCode uses namespace subfolders, Codex does not: ✓ confirmed — `agentPerProjectDir` function routes opencode to `commands/${ns}/`, codex to `.codex/skills/`
- All 12 skill files modified: ✓ confirmed — 0 `/spek:` across all 12 source files; 0 `project_hints` in any skill Reads; `{{CMD_PREFIX}}spek:X` in all Output to user sections
- `.specs/` execution logs not touched: ✓ confirmed — no changes to historical execution logs
- `README.md` and `CLAUDE.md` (SpekLess own docs) not touched: ✓ confirmed — README.md unchanged; CLAUDE.md touched only to remove the `## SpekLess` block per task 14 (within-scope)
- `skills/` remains single source of truth: ✓ confirmed — `installSkillsTo` reads from `skills/` and derives installed copies via substitution

**Goal check:** The implementation is complete. All 12 skill source files use bare `spek:X` for internal refs and `{{CMD_PREFIX}}spek:X` in user-facing output sections. The installer asks which AI agent is being used, routes skills to the correct per-agent directory, and applies prefix substitution on write. Installed copies in `.claude/commands/spek/` have `/spek:X` throughout their Output to user sections with zero `{{CMD_PREFIX}}` literals remaining. `principles.md` documents the platform-neutral sync rule and template-time bake convention. No `/spek:X` patterns remain in `skills/`; no runtime `cmd_prefix` read in any skill; no block injection into `CLAUDE.md`/`AGENTS.md`. The feature is ready to ship.

**Issues found:** None.

**Status:** READY_TO_SHIP
