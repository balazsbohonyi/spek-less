# Execution Log — Add Dark Mode Toggle

#### 2026-04-05 09:12 — Started
Read Plan. Starting tasks in order. Recording starting_sha=7c0e937a in spec.md frontmatter.

#### 2026-04-05 09:18 — Task 1: created `src/theme/state.ts`
Implemented `getTheme`, `setTheme`, `subscribe`. localStorage key `app.theme`.
Unset state returns `'system'` as designed.

#### 2026-04-05 09:24 — Task 1: created `src/theme/index.ts`
Barrel export for the theme module. Kept surface minimal — only the three public functions.

#### 2026-04-05 09:27 — Task 1 complete
Marked task 1 checkbox in Plan.

#### 2026-04-05 09:31 — Task 2: created `src/components/ThemeSelect.tsx`
Native `<select>` with three options. Wrapped in a `<label>` for implicit association.
No ARIA attributes needed — native elements handle it.

#### 2026-04-05 09:38 — Task 2: wired into `src/pages/Settings.tsx`
Added `<ThemeSelect />` under the existing Preferences section. No layout changes needed.

#### 2026-04-05 09:40 — Task 2 complete
Marked task 2 checkbox in Plan.

#### 2026-04-05 09:45 — Task 3: updated `src/app.ts`
Added `initTheme()` call in the mount sequence. Reads current theme, applies it, and
sets up a matchMedia listener for system-preference changes when the user setting is `'system'`.

#### 2026-04-05 09:51 — Task 3: manual smoke test
DevTools → Rendering → Emulate CSS prefers-color-scheme. Switched between light and dark
while theme setting was `'system'` — page theme updated live. Set theme to `'light'` and
repeated — page stayed light regardless of OS preference. Working as designed.

#### 2026-04-05 09:52 — Task 3 complete
Marked task 3 checkbox in Plan.

#### 2026-04-05 09:54 — Course correction
Smoke test in the previous entry revealed a bug: the matchMedia listener was calling
`setTheme('system')` on OS preference change, but not re-applying the CSS class to
`<html>`. Root cause: listener called state setter only; the DOM update (adding/removing
`dark` class) lives in `applyTheme()`, which wasn't wired into the listener.
Fix: updated `src/app.ts` — listener now calls `applyTheme(getTheme())` after updating state.
Small in-scope fix; no replanning needed. Re-ran the smoke test — live OS preference
switching now updates the DOM as expected.

#### 2026-04-05 09:58 — Task 4: wrote `src/theme/state.test.ts`
Tests: get/set round-trip, subscribe notification on change, unset returns `'system'`,
subscribe unsubscribe works. All passing.

#### 2026-04-05 10:04 — Task 4: wrote `src/components/ThemeSelect.test.tsx`
Tests: renders all three options, onChange fires setTheme with the selected value.

#### 2026-04-05 10:06 — Task 4: ran full suite
`bun test theme` — 8 pass, 0 fail.

#### 2026-04-05 10:07 — Task 4 complete
Marked task 4 checkbox in Plan. All tasks done. Ready for spek:verify.

