---
id: 010
title: installer rewrite
status: done
part_of: SpekLess
starting_sha: 0ff3abe
created: 2026-04-11
tags: []
---

# installer rewrite

## Context

> Part of [**SpekLess**](../project.md).

The current `install.sh` produces flat, unstructured terminal output — a wall of `echo` lines with `banner()` dividers and no visual sense of progress. There is no step counter, no clear separation between phases, and no platform-aware feedback. On complex installs (scope 3, custom principles, commit style), users lose track of where they are.

This feature replaces `install.sh` with `install.js` — a zero-dependency Node.js script that delivers a TUI-like experience: compact bordered cards marking each step, an inline progress counter (`Step X of Y`), emoji icons (with auto-detected ASCII fallback on dumb terminals), and ANSI colors throughout. It also hardens the installer against platform edge cases — most critically, Windows-native Node.js being invoked from inside WSL, which produces garbled paths and silent failures.

**Goal:** A developer running `node install.js` on any of the four supported platforms (Linux, macOS, WSL, Windows via Git Bash / CMD / PowerShell) gets a clear, pleasant install experience with no configuration surprises. The old `--defaults`/`-y` flag is preserved for scripted/CI use.

**Out of scope:** `npm` packages or bundling, a shebang/chmod-based Unix-executable mode, interactive editing of existing config values mid-install (behavior matches current: existing config is preserved as-is), and any changes to the config format or skill logic.

**Constraints:** Single file, zero runtime dependencies. Target Node.js 16 LTS minimum (gives `readline/promises`, `fs/promises`). Must respect the `NO_COLOR` environment variable. Must update `CLAUDE.md` and `project.md` to remove the explicit "no Node.js" constraint, since this feature makes Node.js a supported tool.

## Discussion

### Alternatives considered

**Runtime choice — Bash vs Node.js:** The existing Bash installer has one genuine advantage: zero user prerequisites (every Unix/Mac box has Bash). Node.js is ubiquitous in the SpekLess target demographic (developers already using Claude Code), so the prerequisite risk is low in practice. The payoff — proper readline, reliable string manipulation, easy ANSI rendering, structured error handling — is worth the trade. Decision: Node.js.

**npm dependencies (chalk, inquirer, ora) vs zero-dependency stdlib:** Third-party packages would cut the implementation size significantly and give us battle-tested TUI primitives. But they require a `node_modules` directory or a bundle step, neither of which fits a single-file installer shipped as part of a source repo. Decision: zero-dependency — raw ANSI escape codes, `readline/promises` for prompts, and manual box-drawing strings.

**Entry point: `install.js` only vs keep `install.sh` as wrapper:** A thin wrapper (`exec node "$(dirname "$0")/install.js" "$@"`) would preserve backward compatibility for anyone scripting the old path. Given that SpekLess is early-stage and the user base is small, the added complexity isn't justified. Decision: replace `install.sh` outright; update README and docs to reference `node install.js`.

**Invocation: `node install.js` vs Unix-executable (`./install.js` with shebang):** A shebang works fine on Unix/Mac/Git Bash/WSL but does nothing on Windows CMD/PowerShell, requiring a two-path README anyway. `node install.js` is unambiguous everywhere. Decision: explicit `node` invocation, no shebang.

**UI style — compact header cards vs full-width banners:** Full-width `═══` banners are visually striking but feel heavy when repeated six times in a short install run. Compact `┌───┐` cards with the step counter inline are lighter and keep the content visible without requiring the user to scroll back to count where they are. Decision: compact cards.

**Emoji/Unicode fallback — always-on vs auto-detect vs `--no-color` flag only:** Always-on fails silently on old Windows CMD and some CI environments. A `--no-color` flag puts the burden on the user to know they need it. Auto-detection (check `COLORTERM`, `WT_SESSION`, `TERM`, `NO_COLOR`) handles the common cases transparently. Decision: auto-detect, with a clean ASCII fallback for dumb terminals.

### Decisions made

1. **Rewrite `install.sh` as `install.js`** — zero-dep, single file, Node 16+ required.
2. **TUI chrome:** compact `┌──┐` cards with `Step X of Y — Title` and per-section emoji. ANSI colors throughout.
3. **Fallback:** detect terminal capabilities on startup; disable Unicode box-drawing and emoji, strip ANSI codes when `NO_COLOR` is set or the terminal looks dumb. ASCII fallback: `+---+` borders, `[i]` instead of emoji.
4. **Platform edge cases:**
   - *WSL + Windows-native Node.js:* Detect WSL (`/proc/version` contains "Microsoft"/"WSL") and then check if the `node` binary path starts with `/mnt/` (Windows drive mount). If so, print a clear error: "You're running Windows Node.js inside WSL — paths will be wrong. Install Node.js for WSL (e.g. via nvm) and retry." Exit 1.
   - *Windows CMD/PowerShell (native):* `__dirname` and `process.cwd()` return Windows-style paths. Use `path.resolve()` throughout (Node handles this automatically). No special handling needed beyond not assuming forward slashes.
   - *No home directory:* `os.homedir()` can return `null` or an empty string in some container/CI setups. Detect and skip global config/skills install gracefully.
   - *Insufficient permissions:* Wrap directory creation and file writes in try/catch; surface friendly error messages rather than Node stack traces.
5. **`--defaults`/`-y` flag:** preserved exactly as in the Bash installer — skips all prompts, runs non-interactively.
6. **`install.sh` is deleted.** README, `CLAUDE.md`, and `project.md` updated to reference `node install.js`.

### Ambiguities resolved

- *Minimum Node.js version:* Node 16 LTS. Lower is theoretically possible but `readline/promises` (17+... wait — actually `readline/promises` requires Node 17+). Correction: use the callback-based `readline.Interface` from Node 14+ to keep compatibility with Node 14 LTS. If readline/promises is unavailable, promisify manually. Final minimum: **Node 14 LTS**.
- *What happens to the smoke test in `principles.md`:* Update it to use `node install.js` instead of `install.sh`.
- *`package.json`:* Not created. `install.js` is a standalone script with no dependencies to declare.
- *File extension `.js` vs `.mjs`:* `.js` with CommonJS (`require`, `module.exports`) — avoids ESM edge cases on Node 14/16 without `"type": "module"` in a package.json. No package.json → `.js` defaults to CJS → use `require`.

### Open questions

None — all blocking decisions made.

## Plan

<!--
Written by /spek:plan. Fully rewritten on re-run, EXCEPT checkbox state in ### Tasks,
which /spek:execute owns.
-->

### Tasks

<!-- One checkbox per atomic unit of work. /spek:execute ticks these as it completes them. -->

1. [x] Create `install.js` — TUI layer and readline helpers
2. [x] Create `install.js` — config collection flow
3. [x] Create `install.js` — install actions
4. [x] Create `install.js` — platform guards and entry point
5. [x] Delete `install.sh` and update documentation
6. [x] `card()`: full-width banner layout with right-aligned step counter and white box chars
7. [x] `ICONS`: fix welcome icon and upgrade emoji set
8. [x] `collectConfig()`: empty lines after questions and green `/ns:cmd` command highlighting
9. [x] `runInstall()` + Done section: emoji log messages and green command references
10. [x] Fix card icon alignment — replace wide emoji in `ICONS.uni` with narrow BMP symbols
11. [x] Simplify per-file skill copy log to show filename only

### Details

#### 1. Create `install.js` — TUI layer and readline helpers

**Files:** `install.js` (create new)

**Approach:** Write the pure-utility layer: terminal capability detection (check `NO_COLOR`, `COLORTERM`, `WT_SESSION`, `TERM` to decide whether ANSI and Unicode box-drawing are safe), ANSI color/reset strings, a `card(stepN, total, title)` function that renders a compact `┌──┐` bordered step card with `Step X of Y — Title` and a per-section icon, and ASCII fallback (`+---+` borders, `[i]` icons). Also implement `ask(prompt, defaultVal)` and `askYN(prompt, defaultYN)` using `readline.createInterface` with manual promisification (`new Promise(resolve => rl.question(...))`) for Node 14 LTS compatibility — `readline/promises` (Node 17+) must not be used. Include `readYamlValue(filePath, key)` which `grep`s a flat YAML scalar with a regex. No side effects — all functions are exported/module-level, no I/O at module load time. Use CommonJS (`require`) — no `"type":"module"`, no package.json.

#### 2. Create `install.js` — config collection flow

**Files:** `install.js`

**Approach:** Implement `collectConfig(useDefaults)` — an async function that: detects existing per-project (`.specs/config.yaml`) or global (`~/.claude/spek-config.yaml`) config and reads scalar defaults via `readYamlValue`; then runs the full question sequence matching `install.sh` (namespace, specs_root, install scope 1/2/3, suggest_commits, subagent_threshold, project_hints, create_principles, commit_style + custom sub-prompt). When `useDefaults=true`, skip all `readline` calls and return defaults directly. After collecting answers, render a Summary card (`card()`) showing all values, then prompt "Proceed?" (skip in defaults mode). Returns a plain config object. Namespace must be validated (non-empty, no spaces/slashes) with a retry loop — same constraint as `install.sh`. Render each question group inside a named card (e.g. `card(2, 6, 'Configuration')`) so the user sees progress.

#### 3. Create `install.js` — install actions

**Files:** `install.js`

**Approach:** Implement `runInstall(config, scriptDir)` — an async function covering all file operations. Steps: (a) create `specsRoot` and `specsRoot/_templates`; (b) copy every `*.tmpl` from `scriptDir/_templates/`; (c) install skills to per-project dir, global dir, or both per `config.scope`, using `fs.readdirSync` + `fs.copyFileSync`; (d) write config files — read `config.yaml.tmpl`, replace `{{NAMESPACE}}` etc. with `String.prototype.replace(new RegExp('{{KEY}}', 'g'), value)` (no `sed`, no `|` delimiter issue, no shell), skip if file already exists; (e) write `principles.md` from template if `config.createPrinciples && !exists`; (f) append SpekLess block to `CLAUDE.md` unless it already contains `## SpekLess`. Wrap every directory-creation and file-write in `try/catch`; on error, print a friendly one-line message (not a stack trace) and `process.exit(1)`. Log each step with a short `console.log` line matching the existing `install.sh` output style.

#### 4. Create `install.js` — platform guards and entry point

**Files:** `install.js`

**Approach:** Implement `detectPlatformIssues()` — synchronously check if running in WSL (`/proc/version` exists and contains `Microsoft` or `WSL`) and, if so, whether `process.execPath` starts with `/mnt/` (Windows-native Node.js). If both true, print a clear error message ("You're running Windows Node.js inside WSL — paths will be wrong. Install Node.js for WSL (e.g. via nvm) and retry.") and `process.exit(1)`. Implement `safeHomedir()` — calls `os.homedir()`, returns `null` if the result is empty/null; callers guard global-install paths with a `if (!home)` check and skip gracefully. Implement `main()` as an `async` function: parse `process.argv` for `--defaults`/`-y`; call `detectPlatformIssues()`; resolve `scriptDir` via `__dirname`; check for git repo (`fs.existsSync(path.join(cwd, '.git'))`) and offer `git init` if missing; render a welcome card; call `collectConfig(useDefaults)` → `runInstall(config, scriptDir)` → render a Done card with next-steps. Wrap `main()` in `.catch(err => { console.error(err.message); process.exit(1); })`.

#### 5. Delete `install.sh` and update documentation

**Files:** `install.sh` (delete), `README.md`, `CLAUDE.md`, `docs/architecture.md`, `.specs/principles.md`

**Approach:** Delete `install.sh`. Search all markdown files for references to `install.sh` and update them to `node install.js`. In `CLAUDE.md`, remove or reword any language that implies "no Node.js" (specifically the installer-conventions section which says "zero dependencies beyond standard POSIX utilities" — update to reflect the new Node.js requirement and CommonJS single-file approach). Update the smoke test in `principles.md` to use `node install.js` instead of `install.sh`. Check `docs/architecture.md` for any installer-related prose. No changes to skill files or templates — this is purely documentation cleanup and the file removal.

#### 6. `card()`: full-width banner layout with right-aligned step counter and white box chars

**Files:** `install.js`

**Approach:** Rewrite `card()` to render full-terminal-width banners. Use `process.stdout.columns || 80` as `width`; inner width is `width - 2` (for the two side border chars). Left content: `  ${icon}  ${title}  ` (two spaces each side). Right content: `  Step ${stepN} of ${total}  ` (only rendered when `total > 0`). Compute a spacer of `' '.repeat(Math.max(0, innerWidth - leftContent.length - rightContent.length))` to push the step counter to the far right. Assemble: `│` + bold leftContent + spacer + dim rightContent + reset + `│`. Note: emoji icons are 2 columns wide in most terminals; compensate by subtracting 1 from the available spacer width when the icon is an emoji (i.e. a surrogate pair or codepoint > U+FFFF). For the ASCII fallback, use `=` to fill the bar (heavier feel: `+===+`) and place the step counter right-aligned the same way. Change all box-drawing chars from `C.cyan` to `C.reset` (default terminal white/gray) — no other color changes.

#### 7. `ICONS`: fix welcome icon and upgrade emoji set

**Files:** `install.js`

**Approach:** Replace the `ICONS` map entries with proper emoji for the unicode path. Current `welcome: { uni: '>>' }` is a bug — it uses the same `>>` string as the ASCII fallback, so unicode terminals show `>>` instead of a symbol. Replace with `'\u{1F4E6}'` (📦) or `'\u2728'` (✨, BMP safe). Update all other icons to actual emoji: `config: '\u2699\uFE0F '` (⚙️), `summary: '\u{1F4CB}'` (📋), `install: '\u{1F4E5}'` (📥), `done: '\u2705 '` (✅), `error: '\u274C '` (❌), `info: '\u2139\uFE0F '` (ℹ️). Keep ASCII fallback strings as-is. For any emoji that is a surrogate pair (codepoints > U+FFFF like 📦📋📥✅❌), set a `wide: true` property on the icon definition so task 6's `card()` can compensate width calculations. BMP-only symbols like ⚙ (U+2699) and ℹ (U+2139) are 1 column wide — mark as `wide: false`.

#### 8. `collectConfig()`: empty lines after questions and green `/ns:cmd` command highlighting

**Files:** `install.js`

**Approach:** Add a `cmd(str)` helper function: `return TERM.useColor ? C.green + str + C.reset : str`. This wraps a command string in green ANSI. Then: (a) in `collectConfig()`, after every `ask()` or `askYN()` call, add `console.log('')` so there is a blank line separating each question from the next prompt or explanatory text; (b) wherever command strings like `/${namespace}:plan`, `/${namespace}:execute`, `/${namespace}:kickoff` appear in `console.log` calls inside `collectConfig()` (scope explanation text, git integration text, etc.), wrap them with `cmd(...)`. Only add `console.log('')` *after* `ask`/`askYN` calls — not before headers that already have surrounding blank lines.

#### 9. `runInstall()` + Done section: emoji log messages and green command references

**Files:** `install.js`

**Approach:** In `runInstall()`, prefix each significant `console.log` line with an appropriate icon: use `ICONS.done.uni` (✅) for successful copy/write operations, `ICONS.info.uni` (ℹ️) for "Preserving existing…" lines, and `ICONS.error.uni` (❌) for warning/error lines. Keep the text concise — just prepend the icon. In the `main()` Done card output block (step 5 of 5), wrap every `/ns:skill` command reference (e.g. `/${ns}:kickoff`, `/${ns}:adopt`, `/${ns}:new`, `/${ns}:discuss`, `/${ns}:plan`, `/${ns}:execute`, `/${ns}:verify`, `/${ns}:resume`) with `cmd(...)`. Also add `cmd(...)` to the `/${ns}:kickoff` prompt in the git-init section of `main()`. Apply `cmd()` consistently — every user-visible command mention should be green.

#### 10. Fix card icon alignment — replace wide emoji in `ICONS.uni` with narrow BMP symbols

**Files:** `install.js`

**Approach:** The root cause of the misalignment: emoji like 📦 render as narrow fallback glyphs (e.g. ◆) in terminals without full emoji font support, but `wide: true` still subtracts 1 from the spacer, making the content row 1 char too wide and the right `│` overflow or misalign against the top/bottom bars.

Fix in two steps:

(a) Replace all `ICONS.uni` values with narrow BMP symbols (≤ U+FFFF, no variation selectors, no surrogate pairs) and set `wide: false` on every entry:
  - `welcome`: `'\u25c6 '` (◆ BLACK DIAMOND) — matches the terminal's own fallback, looks decorative
  - `config`:  `'\u2699 '` (⚙, strip `\uFE0F` variation selector)
  - `summary`: `'\u2630 '` (☰ TRIGRAM FOR HEAVEN — clean list/menu symbol)
  - `install`: `'\u25b8 '` (▸ SMALL BLACK RIGHT-POINTING TRIANGLE)
  - `done`:    `'\u2713 '` (✓ CHECK MARK)
  - `error`:   `'\u2717 '` (✗ BALLOT X)
  - `info`:    `'\u2139 '` (ℹ, strip `\uFE0F` variation selector)

(b) In `runInstall()`, decouple the log-prefix icons from the ICONS map — `iconOk/iconInfo/iconWarn` currently pull from `ICONS.done.uni` etc., which would now be narrow symbols. Instead, define the log prefix icons with emoji directly:
  - `iconOk   = TERM.useUnicode ? '\u2705 '       : ICONS.done.asc  + ' '`  (✅)
  - `iconInfo = TERM.useUnicode ? '\u2139\uFE0F ' : ICONS.info.asc  + ' '`  (ℹ️)
  - `iconWarn = TERM.useUnicode ? '\u274C '       : ICONS.error.asc + ' '`  (❌)

This preserves emoji in log lines (where overflow doesn't matter) while keeping card icons reliably narrow. The `isWide` mechanism in `card()` stays but is inert (always false with the new icons).

#### 11. Simplify per-file skill copy log to show filename only

**Files:** `install.js`

**Approach:** In `installSkillsTo()`, change the per-file `console.log` to omit the destination path:

```
// Before:
console.log(`  ${iconOk}copied skills/${f} -> ${dest}/${f}`);
// After:
console.log(`  ${iconOk}copied skills/${f}`);
```

No other changes. The "Installing skills to `${dest}`" line that precedes the file loop already tells the user where they're going.

## Verification

**Task-by-task check:**
- Task 1 — TUI layer and readline helpers: ✓ — `detectTerminal()`, `C`, `card()`, `cmd()`, `ask()`, `askYN()`, `readYamlValue()` all present; callback readline (Node 14 compatible); CommonJS (`require`); no I/O at module load time
- Task 2 — Config collection flow: ✓ — full question sequence (namespace→specsRoot→scope→commits→threshold→hints→principles→commitStyle+custom), namespace validation loop, Summary card, Proceed? skipped in defaults mode; all `ask`/`askYN` calls have a trailing `console.log('')`
- Task 3 — Install actions: ✓ — all six substeps present; `String.prototype.replace` via `renderConfig()`; all fs ops go through `mkdirSafe`/`copyFileSafe`/`writeFileSafe`; `installSkillsTo()` inner loop uses `copyFileSafe()` (verify-fix 2 applied at line 393)
- Task 4 — Platform guards and entry point: ✓ — `detectPlatformIssues()` (WSL+Win Node check), `safeHomedir()`, `.catch` wrapper all correct; `useDefaults = defaultsMode` set at line 563 (top of `main()`, before the git-init `askYN` at line 603) — verify-fix 1 applied; `--defaults`/`-y` now suppresses git-init prompt in non-git directories
- Task 5 — Delete install.sh and update documentation: ✓ — `install.sh` deleted; README, CLAUDE.md, docs/architecture.md, .specs/principles.md, .specs/project.md, _templates/config.yaml.tmpl, skills/kickoff.md + new.md all updated
- Task 6 — card() full-width layout: ✓ — `process.stdout.columns||80`, left+spacer+right layout, step counter right-aligned, box chars in `C.reset`, ASCII `=` fallback, `isWide` compensation present (now inert since all icons are narrow BMP)
- Task 7 — ICONS emoji upgrade: ✓ (superseded by Task 10) — final state is consistent with BMP replacements
- Task 8 — Blank lines + cmd() highlights in collectConfig(): ✓ — all `ask`/`askYN` calls have trailing `console.log('')`; `/${namespace}:execute` (line 270) and `/${namespace}:commit` (line 293) wrapped in `cmd()`; two `ask()` prompt arg strings contain bare `/ns:cmd` references (subagentThreshold line 277, createPrinciples line 288) — minor and by design (plan specified console.log wrapping only)
- Task 9 — runInstall() icon prefixes + Done cmd(): ✓ — `iconOk`/`iconInfo`/`iconWarn` emoji locals (`\u2705`, `\u2139\uFE0F`, `\u274C`) decoupled from ICONS map; all significant log lines prefixed; all nine `/ns:skill` references in Done block wrapped in `cmd()`
- Task 10 — Narrow BMP card icons: ✓ — all `ICONS.uni` values replaced with narrow BMP symbols (★⚙☰▸✓✗ℹ), all `wide: false`; `isWide` path is inert; ★ course-correction (◆→★) applied
- Task 11 — Simplify skill copy log: ✓ — `installSkillsTo()` logs `copied skills/${f}` only, no dest path (line 394)

**Principles check:**
- String.prototype.replace substitution (no sed): ✓ — `renderConfig()` uses `.replace(/{{KEY}}/g, value)` for all six placeholders (lines 415–420)
- No secrets in skill files or templates: ✓ — all config in `.specs/config.yaml`
- Sync Rule (skills/ → .claude/commands/spek/): ✓ — skills/kickoff.md, skills/new.md changes replicated to .claude/commands/spek/
- Append-only execution log: ✓ — execution.md has only appended entries; verify fixes appended as course corrections
- _templates/ always overwritten on re-install: ✓ — template copy loop has no `existsSync` guard (lines 378–381); always overwrites

**Goal check:** The implementation achieves the stated goal. `node install.js` on any of the four supported platforms delivers compact bordered step cards with right-aligned step counters, ANSI colors, narrow BMP icons with auto-detected ASCII fallback (`NO_COLOR`, `TERM=dumb`, non-TTY all handled), and reliable cross-platform behavior. The WSL+Windows-native Node.js edge case exits with a clear, actionable error. The `--defaults`/`-y` flag works end-to-end including non-git directories (verify-fix 1). Friendly error handling covers all file operations. `install.sh` is fully replaced and all documentation updated.

**Issues found:**
None.

**Status:** READY_TO_SHIP
