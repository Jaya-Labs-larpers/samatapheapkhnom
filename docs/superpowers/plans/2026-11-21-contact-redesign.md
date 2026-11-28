# Contact Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/contact` layout with topic cards, a form + sticky "Reach us" card, an always-visible safeguarding strip and a restored footer, on desktop and mobile.

**Architecture:** New `TopicCards.astro` drives the existing hidden `<select name="formType">` (same progressive-enhancement contract as `TopicPicker`), so `ContactForm` script, per-topic `:has()` rules and `/api/contact` are untouched. `Contact.astro` gets a new grid; `forms.css` swaps `.topic-picker*` / `.contact-layout*` rules for the new ones.

**Tech Stack:** Astro 7, plain CSS in `src/styles/forms.css` (Tailwind v4 tokens), `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-21-contact-redesign-design.md`

## Global Constraints

- Content stays: reuse existing i18n keys and settings only (`topic*`/`topic*Hint`, `contactHelpTitle`, `formPanelTitleGeneral`, `introContact`, `safeguardingPanelTitle`, `contactSafeguardingPolicy`, `viewOnGoogleMaps`, `donate`). No new user-facing copy; no new i18n keys.
- `forms.css` must keep loading only through `ContactForm.astro` (`tests/performance.test.mjs`: `global.css` must not contain `.topic-picker` or `.form-panel`).
- CSS budget: 16.5 KB gzipped (`scripts/check-performance.mjs`).
- `/contact?topic=partner|volunteer|media|general|safeguarding` deep links must keep preselecting the topic (used by Header, Hero, CTAs). Unknown values (e.g. `donate`) are ignored.
- CTA buttons brand blue; safeguarding keeps danger tokens (`--color-danger-700`, `--color-danger-50`).
- No comments unless the reason is non-obvious (`AGENTS.md`).
- Works in `/` and `/km/` (same template). `npm run check` must pass.

## Review Focus

- JS disabled: native `<select>` is visible and the form still submits.
- `?topic=safeguarding`: form body hidden, safeguarding strip visible, topic cards still usable to switch back.
- `?topic=donate` / garbage value: falls back to General, no error.
- Form reset after successful send: selected card returns to General.
- Keyboard: arrow keys move between cards, Space/Enter select, focus ring visible; screen reader hears one radiogroup labelled "contactHelpTitle".
- Khmer: long labels/hints wrap without overflow at 320 px.

---

### Task 1: `TopicCards` component

**Files:**
- Create: `src/components/forms/TopicCards.astro`
- Create: `tests/topic-cards.test.mjs`

**Interfaces:**
- Consumes: same props shape as `TopicPicker`: `{ lang: Locale; id: string; name: string; labelId: string; topics: readonly Topic[] }`, `Topic = { value: string; label: UIKey; hint: UIKey; tone?: 'danger' }`.
- Produces: root `<div class="topic-cards" data-topic-cards>` containing `<select class="field field--select topic-cards__native" name={name} id={id}>` and `<div role="radiogroup" aria-labelledby={labelId} class="topic-cards__grid">` of `<button type="button" role="radio" class="topic-card" data-value data-tone aria-checked>`; script sets `data-enhanced` on the root.

- [ ] **Step 1: Write failing tests** in `tests/topic-cards.test.mjs` (read source with `readFile`, as `tests/form.test.mjs` does):
  - `keeps a native select named by the name prop as the value carrier` — source matches `<select` and `topic-cards__native`.
  - `cards are a labelled radiogroup of radio buttons` — matches `role="radiogroup"`, `aria-labelledby={labelId}`, `role="radio"`, `aria-checked`.
  - `honours ?topic= and ignores unknown values` — matches `searchParams`/`URLSearchParams(...).get('topic')` and `values.includes(requested)`.
  - `selecting a card sets the select and fires change` — matches `dispatchEvent(new Event('change', { bubbles: true }))`.
  - `re-syncs after form reset` — matches `addEventListener('reset'`.
  - `uses no new i18n keys` — every `t(lang, '…')` literal in the file is already a key in `src/lib/i18n/strings.ts` (none are needed; component only renders `topic.label`/`topic.hint`).
- [ ] **Step 2: Run** `node --test tests/topic-cards.test.mjs` — expect FAIL (file missing).
- [ ] **Step 3: Implement `TopicCards.astro`.** Markup per Interfaces; each card shows `t(lang, topic.label)` and `t(lang, topic.hint)`; first card checked by default. Script (`enhance(root)`): roving `tabindex` (checked card 0, others -1); ArrowLeft/Right/Up/Down move and select; Space/Enter select; select-change listener keeps cards in sync; read `?topic=`; `reset` → `requestAnimationFrame(sync)`; set `root.dataset.enhanced = ''` last. Model script on `TopicPicker.astro` lines 100–228 (reuse its `choose`/`sync`/URL logic, drop the menu/open/close parts).
- [ ] **Step 4: Run** `node --test tests/topic-cards.test.mjs` — expect PASS.
- [ ] **Step 5: Commit** `feat(contact): topic cards component` (stage the two files).

### Task 2: Swap cards into the form and restyle

**Files:**
- Modify: `src/components/forms/ContactForm.astro` (import and `<TopicPicker …/>` → `<TopicCards …/>`, same props)
- Modify: `src/styles/forms.css` (delete `.topic-picker*` rules, lines ~331–505; add `.topic-cards*`, `.topic-card*`)
- Delete: `src/components/forms/TopicPicker.astro` (only `ContactForm` uses it — re-verify with `grep -rl TopicPicker src tests scripts`)
- Modify: `tests/performance.test.mjs` (regex `\.topic-picker` → `\.topic-cards|\.topic-card`)

**Interfaces:**
- Consumes: Task 1 component.
- Produces: CSS classes `.topic-cards`, `.topic-cards__native`, `.topic-cards__grid`, `.topic-card`, `.topic-card__label`, `.topic-card__hint`, `.topic-card[aria-checked='true']`, `.topic-card[data-tone='danger']`.

- [ ] **Step 1:** In `tests/topic-cards.test.mjs` add `ContactForm uses TopicCards, not TopicPicker` (reads `ContactForm.astro`, asserts imports `TopicCards`, no `TopicPicker`) and `forms.css has no topic-picker rules`. Run — FAIL.
- [ ] **Step 2:** Make the swap; delete `TopicPicker.astro`; remove old CSS; add new CSS: grid 5 columns ≥64rem, 3 columns ≥40rem (last row wraps), 1 column below; card = bordered button, checked = blue-700 border + blue-50 fill, danger = danger-700 border/label; `.topic-cards[data-enhanced] > .topic-cards__native { display: none }` and `.topic-cards:not([data-enhanced]) > .topic-cards__grid { display: none }`; `:focus-visible` ring; hint text `--text-sm`, ink-400→ must keep ≥4.5:1 contrast (use ink-600 if ink-400 fails).
- [ ] **Step 3:** Update the performance test regex. Run `npm test` — all PASS.
- [ ] **Step 4:** Run `npm run build` — expect success incl. CSS budget check.
- [ ] **Step 5: Commit** `feat(contact): swap topic picker for cards`.

### Task 3: Page layout

**Files:**
- Modify: `src/page-templates/sko/Contact.astro`
- Modify: `src/styles/forms.css` (replace `.contact-layout*`, `.contact-info*`, `.safeguarding-panel` placement rules, ~674–760)
- Modify: `tests/topic-cards.test.mjs` (page assertions) — name it kept for brevity; or add `tests/contact-page.test.mjs`

**Interfaces:**
- Consumes: `TopicCards` (via `ContactForm`), `getSiteSettings()` fields `phone, email, address, officeHours, mapUrl, safeguardingContact, safeguardingEmail`, `donateHref(lang)` and `donatePageLive` from `~/config/donation`.
- Produces: page structure below.

Structure (all text from existing keys, same as today's template):
1. `<h1 class="sk-h1">` `formPanelTitleGeneral` + `<p>` `introContact` (passed through `withContact`, rendered with `InlineLinks` as elsewhere).
2. `.contact-desk` wrapper holding: topic cards + form (left column) and `<aside class="reach-card">` (right column, `position: sticky` ≥64rem) containing the existing `contact-info` list (email, phone + hours, address + maps link).
3. Safeguarding strip **outside** the form column, full width, always rendered: title, body, policy link, tap-to-call and mailto buttons (existing markup, moved). The existing rule hiding `.safeguarding-panel` unless topic = safeguarding is removed; with safeguarding selected the strip gets stronger emphasis (thicker danger border) via the same `:has()` selector.
4. Closing band with a single Donate link (`t(lang,'donate')`, `donateHref(lang)`) rendered **only when `donatePageLive`** (otherwise the link would point back to this page). Volunteer is already a topic card, so no separate button.
5. Remove `noFooter` from `<BaseLayout>`.

- [ ] **Step 1: Failing tests:** `Contact.astro` has no `noFooter`; renders `safeguarding-panel` without a conditional on topic; Donate band guarded by `donatePageLive`; no string literals other than existing keys (regex `tStrict\(lang, '(\w+)'\)` keys all exist in `strings.ts`/skeleton content); `forms.css` no longer contains `display: none` for bare `.contact-desk .safeguarding-panel`. Run — FAIL.
- [ ] **Step 2:** Rewrite template and CSS to the structure above. Mobile order (single column, `grid-template-areas`): title → form → safeguarding → reach → band. Desktop (≥64rem): two columns (`minmax(0, 1.75fr) minmax(0, 1fr)`), reach card sticky under header offset (`top: calc(var(--header-offset) + 1.5rem)`), safeguarding and band span both columns. Pinned mobile Call button: **not built** (unapproved suggestion).
- [ ] **Step 3:** `npm test && npm run typecheck && npm run build` — all pass.
- [ ] **Step 4: Visual check** with `npm run dev`; screenshots of `/contact`, `/contact?topic=safeguarding`, `/km/contact` at 1280, 768 and 360 px (chrome-devtools MCP). Confirm: no horizontal scroll, cards wrap, sticky card works, form submits in preview (shows "unavailable" message), JS-disabled select visible.
- [ ] **Step 5: Commit** `feat(contact): redesigned page layout`.

### Task 4: Graph and handoff

- [ ] Run `graphify update .` (AGENTS rule after code changes).
- [ ] Run `npm run check`; report result.
- [ ] Do not push; give the user the push commands (memory: guide-user-to-git-push).
