# Execution Log — installer rewrite

<!--
Append-only work journal. /spek:execute writes entries here as it works.
Format: one `#### <timestamp> — <short action>` heading per meaningful action,
followed by a one-to-three line description.

This file is NEVER rewritten. Course corrections, plan revisions, and
verify-flagged fixes all append new entries rather than editing old ones.
Git history is in git; this file is the human-readable narrative.
-->

#### 2026-04-11 — Started
First run. starting_sha: 0ff3abe. Beginning with task 1 (TUI layer and readline helpers).

#### 2026-04-11 — Tasks 1–4 complete: install.js written
Created install.js (~280 lines, CommonJS, zero deps) in one pass covering all four task sections:
- TUI layer: detectTerminal(), ANSI helpers (C.*), card(), ask(), askYN(), readYamlValue()
- Config flow: collectConfig() — reads existing config, runs question loop, renders Summary card
- Install actions: runInstall() — copies templates/skills, writes config.yaml/principles.md, appends CLAUDE.md block
- Platform guards: detectPlatformIssues() (WSL+Windows Node check), safeHomedir(), main() entry point

Smoke test with `node install.js --defaults` in a fresh git repo: all 5 steps rendered, config.yaml
written with no unreplaced {{PLACEHOLDER}} strings, all 10 skills and 5 templates copied.

#### 2026-04-11 — Task 5 complete: documentation cleanup
Deleted install.sh. Updated all non-historical references across:
- README.md (3 occurrences), CLAUDE.md (9 occurrences incl. installer-conventions section rewrite)
- docs/architecture.md (file inventory), .specs/principles.md (smoke test + sed security note)
- skills/new.md + skills/kickoff.md (not-installed messages) — synced to .claude/commands/spek/
- .specs/project.md (4 occurrences), _templates/config.yaml.tmpl + .specs/config.yaml (header comment)
- .specs/_templates/config.yaml.tmpl (runtime template copy)
Historical specs (.specs/003_, 006_) left untouched (frozen records).
All tasks complete. Status advanced to verifying.

#### 2026-04-11 — Resumed
Tasks 1–5 complete. Starting task 6 (card() full-width layout).

#### 2026-04-11 — Tasks 6 + 7 complete: full-width card() and emoji ICONS
Rewrote card() to use process.stdout.columns||80 as terminal width, with leftContent + spacer + rightContent
layout (step counter right-aligned). Added isWide compensation (-1 from spacer when icon is wide emoji).
Changed box-drawing chars from C.cyan to C.reset (default terminal color). ASCII fallback uses = fill.
Updated ICONS: welcome→📦, config→⚙️, summary→📋, install→📥, done→✅, error→❌, info→ℹ️.
Added wide:true/false on every entry so card() can compensate emoji display width.

#### 2026-04-11 — Task 8 complete: cmd() helper + blank lines + green command highlights
Added cmd(str) helper after the C block (wraps in C.green when color enabled).
In collectConfig(): added console.log('') after namespace loop, suggestCommitsAnswer, commitStyle ask,
customRule ask, and confirm ask. Wrapped /${namespace}:execute and /${namespace}:commit in cmd() in
their respective console.log lines.

#### 2026-04-11 — Task 9 complete: icon prefixes in runInstall() and green cmd() in Done
Added iconOk/iconInfo/iconWarn locals at top of runInstall(); unicode icons use built-in trailing space,
ASCII variants get ' ' appended so output reads "[+] Copied" not "[+]Copied".
Prefixed all significant console.log lines: [+] for copies/writes, [i] for "Preserving existing" and skip
messages, [!] for warnings. Wrapped every /ns:skill command in cmd() in main()'s Done block and in the
principles kickoff hint line in runInstall(). Smoke test with --defaults passes; all cards render full-width,
icons + spacing correct. Status advanced to verifying. All 9 tasks complete.

#### 2026-04-11 — Task 10: Replace wide emoji ICONS.uni with narrow BMP symbols
Replacing wide emoji in ICONS.uni with narrow BMP symbols (wide:false on all entries) to fix card alignment.
Decoupling runInstall() log-prefix icons from ICONS map (keep emoji there for log lines where overflow is harmless).

#### 2026-04-11 — Task 10 complete
Replaced all ICONS.uni values with narrow BMP symbols (◆⚙☰▸✓✗ℹ), all wide:false.
runInstall() log-prefix icons now use emoji directly (\u2705, \u2139\uFE0F, \u274C) — decoupled from ICONS map.
Card alignment is now reliable in all terminals; isWide compensation is inert (always false).

#### 2026-04-11 — Task 11: Simplify per-file skill copy log
Removing destination path from installSkillsTo() per-file console.log.

#### 2026-04-11 — Task 11 complete
Changed installSkillsTo() per-file log from `copied skills/${f} -> ${dest}/${f}` to `copied skills/${f}`.
The "Installing skills to ${dest}" line preceding the loop already tells the user the destination.
All 11 tasks complete.

#### 2026-04-11 — Course correction: replace ◆ welcome icon with ★
U+25C6 (◆ BLACK DIAMOND) looks like a tofu/fallback glyph to users — not intentional.
Replaced with U+2605 (★ BLACK STAR) — clearly decorative, supported in all major terminal fonts.

#### 2026-04-11 — Verify fix 1: --defaults doesn't skip git-init prompt
Moving `useDefaults = defaultsMode` to top of main() (before git-init askYN call) so --defaults/-y
suppresses the git-init prompt in non-git directories. Previously it was only set inside collectConfig().

#### 2026-04-11 — Verify fix 2: installSkillsTo() bare fs.copyFileSync
Replaced direct fs.copyFileSync with copyFileSafe() in installSkillsTo() inner loop so per-file
skill copy failures produce the same friendly error format as all other fs operations.

#### 2026-04-11 — Both verify fixes applied
install.js updated. Re-run /spek:verify to confirm.
