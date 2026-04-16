# Execution Log — Multi-agent support

<!--
Append-only work journal. /spek:execute writes entries here as it works.
Format: one `#### <timestamp> — <short action>` heading per meaningful action,
followed by a one-to-three line description.

This file is NEVER rewritten. Course corrections, plan revisions, and
verify-flagged fixes all append new entries rather than editing old ones.
Git history is in git; this file is the human-readable narrative.
-->

#### 2026-04-15 — Started
Read Plan. Beginning with task 1 (add ai_agent and cmd_prefix to config template).

#### 2026-04-15 — Task 1 complete
Added `ai_agent` and `cmd_prefix` fields to `_templates/config.yaml.tmpl` with `{{AI_AGENT}}` and `{{CMD_PREFIX}}` placeholders.

#### 2026-04-15 — Task 2: Update spekless-block.md.tmpl
Replacing hardcoded `.claude/commands/{{NAMESPACE}}/` with `{{SKILLS_DIR}}` and `/{{NAMESPACE}}:X` with `{{CMD_PREFIX}}{{NAMESPACE}}:X` throughout.

#### 2026-04-15 — Task 2 complete
All 9 skill invocation references in `_templates/spekless-block.md.tmpl` now use `{{CMD_PREFIX}}{{NAMESPACE}}:X`; skills dir uses `{{SKILLS_DIR}}`.

#### 2026-04-15 — Task 3: Update install.js
Added askChoice() helper; added agent question after commit style in collectConfig(); moved scope question after agent (paths now computed from aiAgent); updated renderConfig() with AI_AGENT/CMD_PREFIX/SKILLS_DIR; added targetFile (CLAUDE.md vs AGENTS.md) logic; updated done output with cmdPrefix.

#### 2026-04-15 — Task 3 complete
install.js now fully agent-aware: 8 sub-changes (a–h) applied per spec.

#### 2026-04-15 — Task 4: Strip Type A `/spek:` from skills/*.md
Global replace `/spek:` → `spek:` in all 12 skill files. Output to user sections also stripped (task 5 will add cmd_prefix instruction there). Verified 0 occurrences remain.

#### 2026-04-15 — Task 4 complete
All 12 skill files: zero `/spek:` occurrences remain.

#### 2026-04-15 — Task 5: Add cmd_prefix read and prepend instruction to skills
Extended config.yaml Reads bullet in all 12 files to include `cmd_prefix`. Added "Prepend `cmd_prefix`..." instruction line to each ## Output to user section.

#### 2026-04-15 — Task 5 complete
All 12 skill files updated: Reads list includes cmd_prefix, Output to user sections have prepend instruction.

#### 2026-04-15 — Task 6: Update .specs/principles.md
Replaced Sync Rule section with agent-aware version including directory mapping table. Added new Command References section (bare spek:X rule + cmd_prefix runtime prepend rule).

#### 2026-04-15 — Task 6 complete
principles.md updated with agent-aware Sync Rule table and Command References section.

#### 2026-04-15 — Task 7: Strip `/spek:` from _templates/
Global replace in spec.md.tmpl, project.md.tmpl, principles.md.tmpl, execution.md.tmpl, config.yaml.tmpl. Verified 0 occurrences remain.

#### 2026-04-15 — Task 7 complete
All 5 affected template files stripped. {{CMD_PREFIX}}{{NAMESPACE}}:X patterns from task 2 untouched.

#### 2026-04-15 — Task 8: Update docs/maintenance.md and docs/architecture.md
maintenance.md: fixed H1 header (spek: not /spek:), added Platform command prefix note, added new template placeholders. architecture.md: added config field table, agent→directory mapping table, CLAUDE.md vs AGENTS.md note, updated spekless-block.md.tmpl description.

#### 2026-04-15 — Task 8 complete

#### 2026-04-15 — Task 9: Strip /spek: from examples/
Global replace in examples/002_adopted-feature/spec.md (6 occurrences) and examples/001_toy-feature/execution.md (1 occurrence).

#### 2026-04-15 — Task 9 complete

#### 2026-04-15 — Task 10: Sync skills/ to .claude/commands/spek/
Copied all 12 skill files. Verified 0 /spek: occurrences in installed copies.

#### 2026-04-15 — Task 10 complete

#### 2026-04-15 — Addressing verify-flagged issues
Two issues from verify pass:
1. `install.js:357` — summary card namespace line used hardcoded `/` instead of `${cmdPrefix}`. Fixed.
2. `docs/maintenance.md:42` — description field example still quoted `/spek:kickoff` and `/spek:adopt`. Updated to bare `spek:` form.

#### 2026-04-15 — Verify fixes complete
Both issues resolved. Ready for re-verify.

#### 2026-04-15 — Addressing second verify-flagged issues (3 new)
1. `install.js:284,291,302,307` — Four early collectConfig() prompts used hardcoded `/${namespace}:X`; stripped leading `/` so they show bare `namespace:X`. cmdPrefix prepended only after agent question is answered.
2. `install.js:661,662` — Git-repo check message used `/spek:verify` and `/spek:commit` (before namespace is known); replaced with bare `spek:verify` / `spek:commit`.
3. `docs/maintenance.md:134` — Smoke test hardcoded `.claude/commands/spek/`; updated with note that path depends on ai_agent.

#### 2026-04-15 — Second verify fixes complete
All 3 issues resolved. Zero `/spek:` or hardcoded `/${namespace}:` remaining in install.js.

#### 2026-04-16 — Task 11: Replace runtime cmd_prefix read with template-time bake
Updating all 12 skill files: remove cmd_prefix from Reads, remove runtime prepend instruction, add {{CMD_PREFIX}} placeholder to spek:X references in Output to user sections. Updating install.js: installSkillsTo(dest, prefix) applies {{CMD_PREFIX}} substitution on write.

#### 2026-04-16 — Task 11 complete
All 12 skill files updated; zero cmd_prefix references remain. install.js installSkillsTo now reads source, substitutes {{CMD_PREFIX}}, writes rendered content to destination.

#### 2026-04-16 — Task 12: Remove ai_agent/cmd_prefix from config.yaml.tmpl and install.js
Removed ai_agent and cmd_prefix fields from config.yaml.tmpl. Removed defaultAiAgent read from collectConfig(); agent question now defaults to index 0 (Claude Code). Removed {{AI_AGENT}} and {{CMD_PREFIX}} replace calls from renderConfig().

#### 2026-04-16 — Task 12 complete

#### 2026-04-16 — Task 13: Fix install.js — always overwrite config.yaml on re-run
Removed preserve-on-exists guard for both per-project and global config.yaml. Both paths now unconditionally call writeFileSafe(). collectConfig() already reads existing values as defaults before prompting, so re-run output reflects user's current choices.

#### 2026-04-16 — Task 13 complete

#### 2026-04-16 — Task 14: Remove SpekLess block injection and spekless-block.md.tmpl
Removed (f) block injection section from install.js (targetFile, speklessBlock render, existence check, writeFileSafe). Removed {{SKILLS_DIR}} replace from renderConfig(). Deleted _templates/spekless-block.md.tmpl. Removed ## SpekLess section from this project's CLAUDE.md.

#### 2026-04-16 — Task 14 complete

#### 2026-04-16 — Task 15: Remove project_hints from installer, config.yaml.tmpl, and skills
Removed project_hints field from config.yaml.tmpl. Removed defaultProjectHints read, interactive prompt, projectHints from return value and summary card, and {{PROJECT_HINTS}} replace from renderConfig() in install.js. Removed project_hints from Reads bullets in 5 skill files (adopt, execute, plan, discuss, quick). Updated quick.md context template text.

#### 2026-04-16 — Task 15 complete

#### 2026-04-16 — Task 16: Update .specs/principles.md — Sync Rule and Command References
Sync Rule: replaced "When adding a new skill update spekless-block.md.tmpl" paragraph with a note that sync is not a raw copy — {{CMD_PREFIX}} substitution must be applied. Command References: rewrote two bullets with template-time bake rule ({{CMD_PREFIX}}spek:X in Output to user, bare spek:X internally, no runtime config.yaml read).

#### 2026-04-16 — Task 16 complete

#### 2026-04-16 — Task 17: Update docs/architecture.md and docs/maintenance.md
architecture.md: removed project_hints, ai_agent, cmd_prefix from config.yaml fields table; removed "Target doc" paragraph; removed spekless-block.md.tmpl from file tree. maintenance.md: rewrote Platform command prefix note to describe template-time bake; updated template placeholder list (removed PROJECT_HINTS, AI_AGENT, CMD_PREFIX from config.yaml.tmpl entry, removed spekless-block.md.tmpl entry); updated idempotency bullet — config.yaml now always overwritten.

#### 2026-04-16 — Task 17 complete

#### 2026-04-16 — Task 18: Sync updated skills to .claude/commands/spek/ with {{CMD_PREFIX}} → /
Copied all 12 skill files from skills/ to .claude/commands/spek/, applying {{CMD_PREFIX}} → / substitution. Verified zero {{CMD_PREFIX}} literals remain in installed copies; 11 /spek: occurrences confirmed in Output to user sections across 8 files.

#### 2026-04-16 — Task 18 complete
All tasks 11–18 complete. All 18 plan tasks are now checked.

#### 2026-04-16 — Addressing verify-flagged issues (8 items)
Issues 1–4: bare `spek:X` in user-facing output sections of resume.md, status.md, verify.md, commit.md — replacing with `{{CMD_PREFIX}}spek:X`.
Issues 5–6: dead `skillsDirDisplay` variable + stale comment in install.js.
Issues 7–8: stale `spekless-block.md.tmpl` entry and `{{PROJECT_HINTS}}` example in CLAUDE.md.

#### 2026-04-16 — Verify-fixes complete
All 8 issues resolved. resume.md, status.md, verify.md, commit.md updated in skills/ and synced to .claude/commands/spek/ with {{CMD_PREFIX}} → / substitution. Zero {{CMD_PREFIX}} literals in installed copies confirmed.

#### 2026-04-16 — Post-advisor review: fix stale Context section
Advisor flagged that "Done looks like" described the original approach (runtime cmd_prefix read, AGENTS.md injection, ai_agent in config.yaml) rather than the delivered template-time bake approach. Fixed "Done looks like" and updated the Discussion note on template-time substitution to show it was initially rejected then reversed in task 11, with the reason why.

#### 2026-04-16 — Task 19: Fix stale idempotency banner in install.js
User flagged that the welcome banner said "preserve your features and config, only patching anything missing" — both claims wrong after task 13 (config.yaml always overwritten) and task 14 (no AGENTS.md injection). Rephrased to: "will preserve your existing features and principles.md. config.yaml is always regenerated (existing values shown as defaults)."

#### 2026-04-16 — Task 19 complete

#### 2026-04-16 — Task 20: Delete `.specs/_templates/spekless-block.md.tmpl`
Deleted the stale installed template copy. The source was removed in task 14; the installed copy at `.specs/_templates/spekless-block.md.tmpl` was overlooked. Confirmed five templates remain: config.yaml.tmpl, execution.md.tmpl, principles.md.tmpl, project.md.tmpl, spec.md.tmpl.

#### 2026-04-16 — Task 20 complete

#### 2026-04-16 — Task 21: `install.js` — purge stale skill files from dest before re-installing
Added stale-file purge inside `installSkillsTo(dest, prefix)`: after `mkdirSafe(dest)`, reads existing `.md` files in dest, builds a Set of source skill filenames, deletes any dest files not in the source set, then proceeds with the existing copy loop.

#### 2026-04-16 — Task 21 complete

#### 2026-04-16 — Task 22: `install.js` — purge stale template files from `.specs/_templates/` before re-copying
Added stale-file purge in section (b) of `runInstall`: after `mkdirSafe(templatesDest)`, reads existing `.tmpl` files in dest, builds a Set of source tmpl filenames, deletes any dest files not in the source set, then proceeds with the existing copy loop.

#### 2026-04-16 — Task 22 complete

#### 2026-04-16 — Task 23: Update `principles.md` Sync Rule — human-readable agent names, add deletion handling
Changed Sync Rule intro to mention deletion (plus note that `node install.js` handles it automatically). Replaced `| ai_agent |` column header with `| AI Agent |` and identifiers `claude_code`/`codex`/`opencode` with "Claude Code"/"Codex"/"OpenCode".

#### 2026-04-16 — Task 23 complete

#### 2026-04-16 — Task 24: Update `docs/architecture.md`, `docs/maintenance.md`, and `CLAUDE.md` — readable agent names
architecture.md: changed `| \`ai_agent\` |` table header to `| AI Agent |`; changed `claude_code`/`codex`/`opencode` row identifiers to "Claude Code"/"Codex"/"OpenCode". maintenance.md: updated smoke test `ls` comment to use readable names. CLAUDE.md: updated commit example from `per ai_agent` to `to correct agent directory`.

#### 2026-04-16 — Task 24 complete

#### 2026-04-16 — Task 25: Update `install.js` — fix stale `ai_agent` comment
Replaced `// (c) Install skills — directory depends on ai_agent` with `// (c) Install skills — directory and prefix depend on the chosen AI agent`.

#### 2026-04-16 — Task 25 complete
All tasks 20–25 complete. All 25 plan tasks are now checked.
