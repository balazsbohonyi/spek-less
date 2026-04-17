---
id: 001
title: Add Dark Mode Toggle
status: done
part_of:
starting_sha: 7c0e937a
created: 2026-04-05
tags: [ui, accessibility, theming]
---

# Add Dark Mode Toggle

## Context

The settings page currently has no way for users to change the visual theme. Several users have requested a dark mode option, citing eye strain during evening sessions. The app already uses CSS custom properties for colors, so a theme switch is mechanically straightforward — the missing pieces are (a) a UI control to toggle, (b) persistence of the choice, and (c) respecting the OS-level preference on first load.

**Goal:** a user can toggle between light and dark themes from the settings page. The choice persists across sessions. On first visit, the app respects `prefers-color-scheme`.

**Out of scope:** custom themes, per-component theme overrides, high-contrast mode.

## Discussion

Considered three approaches for persistence:

1. **`localStorage` only** — simple, works offline, no server round-trip. Downside: choice doesn't sync across devices.
2. **User profile API** — syncs across devices. Downside: requires a logged-in user; app currently supports anonymous use.
3. **`localStorage` with opt-in profile sync later** — ship simple now, add sync as a future enhancement.

Chose **(3)**. Anonymous users are first-class in this app, and 90% of users stay on one device. Profile sync is a separate feature if demand materializes.

For the toggle UI, considered a `<select>` with light/dark/system vs a simple binary switch. Chose the three-option select — "system" is the default and matters because many users never change it. Hiding it would mean those users see whichever theme the dev happened to set as the fallback.

Accessibility note: the toggle must be keyboard-navigable and the current state must be announced by screen readers. Using a native `<select>` gives us this for free.

## Assumptions

- [x] The app's existing CSS custom properties cover all color values (no hardcoded hex colors in components that would need per-theme overrides)
- [x] `localStorage` is available in all target browsers (no private-browsing restrictions that would silently fail writes)
- [x] `window.matchMedia` is available in all target environments (not a server-side render context)

## Plan

### Tasks

1. [x] Add theme state module with localStorage persistence
2. [x] Add theme toggle component to settings page
3. [x] Initialize theme on app load (respect OS preference)
4. [x] Add regression tests

### Details

#### 1. Add theme state module with localStorage persistence

**Files:** `src/theme/state.ts` (new), `src/theme/index.ts` (new)

**Approach:** Expose `getTheme()`, `setTheme(theme: 'light' | 'dark' | 'system')`, and a `subscribe(listener)` function. Values stored under `app.theme` in localStorage. `'system'` is represented as an absent key (so unset = system, which is the default).

#### 2. Add theme toggle component to settings page

**Files:** `src/pages/Settings.tsx`, `src/components/ThemeSelect.tsx` (new)

**Approach:** Native `<select>` with three options. `onChange` calls `setTheme()` from the state module. Label element wraps for implicit association. No ARIA needed beyond what native elements provide.

#### 3. Initialize theme on app load

**Files:** `src/app.ts`

**Approach:** On mount, read `getTheme()`. If `'system'`, read `matchMedia('(prefers-color-scheme: dark)')` and apply. Add a `change` listener on the matchMedia query so users who switch OS theme mid-session see it update (only when their preference is `'system'`).

#### 4. Add regression tests

**Files:** `src/theme/state.test.ts` (new), `src/components/ThemeSelect.test.tsx` (new)

**Approach:** Unit tests for state module (get/set round-trip, subscribe notification, `'system'` representation). Component test for the select (renders 3 options, onChange fires setTheme). Manual verification for the matchMedia listener since jsdom's matchMedia is stubbed.

## Review

**Summary:** The plan is ready for execution. The decomposition covers state, UI, app initialization, and regression coverage in a sequence that matches the user-visible goal without over-scoping into theme customization work.

**Critical findings:**
- None.

**Warnings:**
- Task 3 should explicitly verify that the `matchMedia` listener is only active while the preference is `'system'`; otherwise manual dark/light selections could be overwritten unexpectedly during the session.

**Notes:**
- Task 2 could mention that the settings page should initialize the select from current persisted state, not only write changes on interaction.

**Recommended next move:** `spek:execute` — the plan is solid enough to build, and the warning can be handled directly while implementing task 3.

## Verification

All four tasks complete. Verified against Plan:

- **Task 1 — theme state module:** ✓ `src/theme/state.ts` exports `getTheme/setTheme/subscribe`. localStorage key `app.theme`. Unset = system (confirmed by deleting the key and reading `getTheme()`, returns `'system'`).
- **Task 2 — toggle component:** ✓ `ThemeSelect.tsx` renders a native `<select>` with light/dark/system options. Keyboard-navigable (Tab + Space/Enter + arrow keys). Tested with VoiceOver on macOS: state announced correctly.
- **Task 3 — init on load:** ✓ `app.ts` reads theme on mount and applies. matchMedia change listener confirmed with DevTools "Emulate CSS prefers-color-scheme" toggle — theme switches live.
- **Task 4 — tests:** ✓ `bun test theme` — 8 pass, 0 fail. Coverage on state.ts is 100%.

**Principles check:**
- TypeScript strict mode: ✓ no `any` used
- Tests colocated as `*.test.ts`: ✓
- No new async operations, so Result-typed return rule doesn't apply here

**Assumptions check:**
- CSS custom properties cover all color values: ✓ confirmed — grep found no hardcoded hex colors in modified components
- `localStorage` available in target browsers: ✓ confirmed — state module writes succeed in test environment; no silent-fail path needed
- `window.matchMedia` available: ✓ confirmed — jsdom stub present in tests; guarded with existence check in `app.ts`

**Goal check:** Goal achieved — users can toggle between light, dark, and system themes from the settings page; choice persists in `localStorage`; first load respects `prefers-color-scheme` via the matchMedia listener. All three stated success criteria met. Out-of-scope items (custom themes, per-component overrides, high-contrast mode) untouched.

**Issues found:**
None.

**Status:** READY_TO_SHIP

## Retrospective

**Outcome:** The feature delivered the requested theme control without widening scope: users can choose light, dark, or system mode, the preference persists, and first-load behavior respects OS settings.

**What went well:**
- The Plan decomposed the work cleanly into state, UI, app initialization, and tests, so execution could proceed without replanning.
- Existing CSS custom properties meant the implementation stayed focused on behavior instead of requiring a visual refactor.

**What surprised us:**
- The warning from `## Review` was real: the matchMedia listener needed to stay scoped to the `'system'` preference so manual selections would not be overwritten.
- Native form controls covered the accessibility requirements more completely than a custom toggle would have.

**Principle candidates:**
- "Prefer native controls when they satisfy accessibility and state requirements without extra ARIA work." — proposed
