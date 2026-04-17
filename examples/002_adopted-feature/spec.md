---
id: 002
title: User Authentication Module
status: done
part_of:
starting_sha: e4f8a21b
created: 2026-04-06
tags: [auth, security, session-management]
---

# User Authentication Module

## Context

*This spec was created retroactively via `spek:adopt`. The Context below is inferred from the existing code — it was not written before implementation.*

The application needs user authentication to protect private routes and personalize the experience. The auth module in `src/auth/` handles login, logout, session persistence via HTTP-only cookies, and route guards. It supports email/password credentials only (no OAuth, no magic links).

**Goal (inferred):** authenticated users can log in, stay logged in across page reloads, and be redirected to login when accessing protected routes while unauthenticated.

**Out of scope (inferred):** OAuth / social login, multi-factor authentication, password reset flow (handled by a separate module at `src/account/`), role-based access control.

## Discussion

*Design decisions visible in the code, as understood by `spek:adopt`:*

**Session strategy — HTTP-only cookies vs localStorage tokens.** The code uses HTTP-only cookies with `SameSite=Strict`. This is the more secure option: tokens never touch JavaScript, eliminating XSS-based token theft. The trade-off is that the server must handle cookie management, and CORS configuration must include `credentials: 'include'`. The code accepts this trade-off explicitly — `src/auth/client.ts` sets `credentials: 'include'` on every fetch call.

**Route guarding — HOC vs middleware vs route config.** The code uses a `RequireAuth` wrapper component (`src/auth/RequireAuth.tsx`) rather than middleware or route-level config. This is the React-idiomatic approach and keeps guard logic colocated with the component tree. The alternative would have been server-side middleware redirects, which the code does NOT do — all route protection is client-side.

**What the code explicitly does NOT do:** there is no token refresh mechanism. Sessions expire when the cookie expires (24h, set in `src/auth/config.ts`). No refresh token, no silent renewal. This is a simplicity choice that works for the current user base but would need revisiting for longer sessions.

## Assumptions

<!--
Written by spek:discuss. Things taken as given before building — external service
behavior, data contracts, scale limits, third-party availability.
Checkboxes ticked [x] by spek:verify when confirmed in the implementation.
Unverifiable assumptions are flagged explicitly rather than left silently unchecked.

This feature was adopted via spek:adopt — no spek:discuss pass was run,
so assumptions were not captured. Add them manually if needed.
-->

## Plan

### Tasks

1. [x] Create auth API client with cookie-based session handling
2. [x] Build login page with form validation
3. [x] Implement RequireAuth route guard component
4. [x] Add session persistence check on app load
5. [x] Write auth module tests

### Details

#### 1. Create auth API client with cookie-based session handling

**Files:** `src/auth/client.ts`, `src/auth/config.ts`, `src/auth/types.ts`

**Approach:** Fetch wrapper with `credentials: 'include'` for all auth endpoints (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`). Config exports `SESSION_DURATION_HOURS = 24` and API base URL. Types define `User`, `LoginCredentials`, `AuthResponse`.

#### 2. Build login page with form validation

**Files:** `src/pages/Login.tsx`, `src/auth/useAuth.ts`

**Approach:** Controlled form with email + password fields. Client-side validation (non-empty, email format) before submission. `useAuth` hook exposes `login()`, `logout()`, `user`, `isLoading`. On successful login, redirect to the URL the user originally requested (stored in location state by RequireAuth).

#### 3. Implement RequireAuth route guard component

**Files:** `src/auth/RequireAuth.tsx`

**Approach:** Wrapper component that checks `useAuth().user`. If null and not loading, redirects to `/login` with the current path in location state. If loading, renders a spinner. If authenticated, renders children. Used in route config: `<Route element={<RequireAuth><Dashboard /></RequireAuth>} />`.

#### 4. Add session persistence check on app load

**Files:** `src/app.ts`, `src/auth/useAuth.ts`

**Approach:** On mount, `useAuth` calls `GET /api/auth/me`. If the cookie is valid, the server returns the user object; if expired or absent, returns 401. The hook sets `user` accordingly. This means a page reload preserves the session without re-entering credentials (as long as the cookie hasn't expired).

#### 5. Write auth module tests

**Files:** `src/auth/client.test.ts`, `src/auth/RequireAuth.test.tsx`, `src/auth/useAuth.test.ts`

**Approach:** Unit tests for the client (mocked fetch: login success/failure, logout clears state, /me returns user or 401). Component test for RequireAuth (renders children when authenticated, redirects when not, shows spinner while loading). Hook tests for useAuth (login/logout state transitions, persistence check on mount). *Note: the existing tests use `vi.mock` for fetch — this predates the `principles.md` preference for integration tests with a real server, and would need migration to comply.*

## Review

**Summary:** Not run. This spec was created retroactively via `spek:adopt`, so there was no pre-execution design-review checkpoint before the code existed.

**Critical findings:**
- None recorded.

**Warnings:**
- None recorded.

**Notes:**
- If this module is substantially revised in the future, run `spek:review` after updating `## Plan` so the next execution cycle has a proper design-review artifact.

**Recommended next move:** `spek:verify` — for adopted work, verification is the first meaningful check because the implementation already exists.

## Verification

<!-- Run spek:verify to populate this section. For an adopted feature, verify
     checks that each task's Details match the actual code — discrepancies are
     documentation issues, not bugs. -->
