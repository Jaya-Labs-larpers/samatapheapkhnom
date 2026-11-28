# Cookie Consent Bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Accept/Decline bar with Accept all / Reject optional / Preferences (Necessary + Analytics switch), shown on first visit in every environment.

**Architecture:** Pure consent logic in `src/lib/consent.ts` (unit-tested with the repo's `node:test` + `vm` pattern). `CookieSettings.astro` holds markup, styles and a small script wiring DOM to that logic. GTM still loads lazily via `whenSettled`, only when a container id exists (production) and the choice is `accepted`.

**Tech Stack:** Astro 7, TypeScript, node:test.

**Spec:** `docs/superpowers/specs/2026-11-20-cookie-consent-bar-design.md`

## Global Constraints

- Storage key `sko-analytics-choice`, values `accepted` | `declined` only (existing visitors keep their choice).
- Copy exactly as in the spec's copy table (EN + KM).
- Reject optional and Accept all styled identically (solid brand blue); Preferences outline.
- No new dependencies. No GTM in `<head>` (`tests/performance.test.mjs` asserts this).
- Bar renders on every non-minimal page in every environment; GTM script only when `gtmId` is non-empty.
- No commits unless the user asks (user rule).

## Review Focus

- localStorage throws (private mode) → bar still works for the session, no console error.
- Visitor with a pre-existing `accepted`/`declined` value → no bar on load; footer link shows Preferences with switch matching.
- Withdrawing after GTM loaded → `_ga` and `_ga_*` cleared for host and parent domains, page reloads.
- Choice made in another tab → this tab updates (existing `storage` listener kept).
- Phone width (360px) → buttons wrap full-width, no horizontal scroll, bar doesn't cover more than ~half the screen with Preferences open.

---

### Task 1: Consent logic module

**Files:**
- Create: `src/lib/consent.ts`
- Test: `tests/consent.test.mjs` (copy the transpile + `vm` loader from `tests/lazy.test.mjs`)

**Interfaces:**
- Produces:
  - `export const CONSENT_KEY = 'sko-analytics-choice'`
  - `export type Choice = 'accepted' | 'declined'`
  - `export function readChoice(storage: Pick<Storage, 'getItem'> | null | undefined): Choice | null`
  - `export function saveChoice(storage: Pick<Storage, 'setItem'> | null | undefined, choice: Choice): void`
  - `export function analyticsCookieNames(cookieHeader: string): string[]`
  - `export function clearAnalyticsCookies(doc: { cookie: string }, hostname: string): void`

- [ ] **Step 1: Write failing tests**
  - `readChoice` returns `'accepted'`/`'declined'` for those values; `null` for `null`, `'yes'`, a throwing `getItem`, and `undefined` storage.
  - `saveChoice` with a throwing `setItem` does not throw.
  - `analyticsCookieNames('_ga=1; _ga_ABC123=2; theme=x; _gax=3')` deep-equals `['_ga', '_ga_ABC123']`.
  - `clearAnalyticsCookies` on a fake doc (getter returns `'_ga=1; _ga_X=2'`, setter records writes) with hostname `'www.sko.org.kh'` records, for each of `_ga` and `_ga_X`: `<name>=; Max-Age=0; path=/` plus `; domain=` variants for `www.sko.org.kh`, `sko.org.kh`, `org.kh` (never a single-label domain). With hostname `'localhost'` only the no-domain write.

- [ ] **Step 2: Run** `node --test tests/consent.test.mjs` → FAIL (module missing).

- [ ] **Step 3: Implement `src/lib/consent.ts`** — try/catch around storage calls; cookie names match `/^_ga(_|$)/`; domains = every dot-suffix of hostname with ≥2 labels.

- [ ] **Step 4: Run** `node --test tests/consent.test.mjs` → PASS.

### Task 2: Upgraded bar and Preferences panel

**Files:**
- Modify: `src/components/layout/CookieSettings.astro` (markup, labels, script, styles)
- Modify: `src/components/layout/Footer.astro:103` → render `<CookieSettings lang={lang} containerId={gtmId} />` unconditionally
- Test: `tests/performance.test.mjs` existing GTM test must still pass

**Interfaces:**
- Consumes: everything from Task 1; `whenSettled` from `~/lib/lazy`.

- [ ] **Step 1: Markup**
  - Footer toggle button (label "Cookie settings" / "ការកំណត់ខូគី") keeps `aria-controls`/`aria-expanded`.
  - `<section>` bar: message + link to `localizePath('/privacy', lang)`; buttons `data-action="preferences" | "reject" | "accept"` in that visual order.
  - Preferences `<div hidden>` inside the bar: Necessary row with "Always on" text; Analytics row with `<button role="switch" aria-checked>`; `data-action="save"` button.
  - All strings from the spec copy table.

- [ ] **Step 2: Script behaviour**
  - On load: `readChoice(localStorage)`; `null` → show bar (prefs collapsed); `accepted` → schedule GTM (only if `containerId`).
  - accept → save `accepted`; reject → save `declined`; save → per switch state. Then hide bar, return focus to footer toggle if opened from there.
  - Footer toggle opens bar with Preferences expanded, switch set to `readChoice(...) === 'accepted'`, focus on the switch.
  - Going `accepted` → `declined` after GTM started: `clearAnalyticsCookies(document, location.hostname)` then `location.reload()`.
  - Keep `storage`, `pageshow`, `prerenderingchange` listeners; keep the `choice !== 'accepted'` guard in the GTM loader.

- [ ] **Step 3: Styles** — existing bar styles; Accept/Reject solid `--color-blue-700` with white text; Preferences outline; switch track/thumb from design tokens; under 640px buttons stack full-width.

- [ ] **Step 4: Verify**
  - `npm test` → all pass.
  - `npm run typecheck` → no errors.
  - `npm run dev`, fresh profile/cleared storage: bar visible on first load; Accept/Reject hide it and store value; footer link opens Preferences; switch + Save works; Khmer page shows Khmer copy; 360px width has no horizontal scroll. Dev has no GTM request (empty id).
  - `npm run build:production` → passes; built HTML contains `GTM-MSXSCPTS` only inside the component script.
