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

## Plan

### Tasks

- [x] 1. Add theme state module with localStorage persistence
- [x] 2. Add theme toggle component to settings page
- [x] 3. Initialize theme on app load (respect OS preference)
- [x] 4. Add regression tests

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

**No issues flagged.** Feature is ready to ship.
