# Home Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-present existing SKO home content in the section structure of `~/Sites/radiatinghope-clone`, with a new glass-pill nav and light footer.

**Architecture:** Extend the existing `Sk*` Astro components and `SkeletonHome.astro` (branch `feat/scroll-motion`, already half-restructured, uncommitted). New sections are small Astro components fed by existing content getters; scroll behaviour reuses `src/lib/{scrub,scroll-text,count-up,carousel}.ts`. Nav/footer restyle `Header.astro` / `Footer.astro` in place.

**Tech Stack:** Astro 7, Tailwind 4 + `src/styles/skeleton.css` / `global.css`, TypeScript, `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-18-home-restructure-design.md` (clone research: `~/Sites/radiatinghope-clone/docs/research/landing-structure/*.md`).

## Global Constraints

- No new copy, claims, numbers, names, prices. No new keys in `src/lib/i18n/strings*.ts`; reuse existing keys (`tStrict` / `t`). A section with no data renders nothing.
- Khmer (`/km/`) and English both render; set `lang` attrs via `langAttr(pick(...))` as existing `Sk*` components do.
- No new dependencies. No clone assets, fonts or copy. Fonts unchanged (Noto Sans UI + navbar, Source Serif 4 body).
- Map is `public/maps/cambodia-phnom-penh.svg` (SKO's own, Natural Earth). Do not use the Wikimedia CC BY-SA image.
- Motion follows `docs/17-scroll-motion.md`: finished static page first; reduced motion and no-JS stay readable. JS budget in `scripts/check-performance.mjs` (12,000 B gzipped) must still pass.
- Default to no code comments (`AGENTS.md`).
- Do not commit or push; the user runs git themselves. Leave existing uncommitted edits in place and build on them.

## Review Focus

- Zero stories / zero events / zero partners / no photo on a program: section omitted, no empty heading or broken slider.
- One story only: no slider chrome (prev/next), still readable.
- Khmer: scrubbed text splits by word, long titles in pill nav and cards don't overflow.
- Nav over the hero (dark) vs over white pages (no hero): text must stay legible at both, including sub-pages without `data-hero-dark`.
- Mobile 390px: nav pill collapses to the existing phone menu; no horizontal page scroll.

---

### Task 1: Events grouping helper

**Files:**

- Modify: `src/lib/skeleton-content.ts`
- Test: `tests/events.test.mjs` (load the TS via the `vm` + `ts.transpileModule` pattern in `tests/stats.test.mjs`; stub imports by testing a pure function that takes already-picked data)

**Interfaces:**

- Produces: `export interface SkEventRow { href: string; title: string; titleLang?: string; datetime?: string; day: string; month: string; date: string; category: Activity['category'] }` and `export function eventRows(activities: Activity[], lang: Locale): SkEventRow[]` — keeps only `category` `'event'` or `'announcement'`, sorted newest `publishedAt` first, entries without `publishedAt` last.
- Produces: `export function eventTabs(rows: SkEventRow[]): { category: 'event' | 'announcement'; rows: SkEventRow[] }[]` — one tab per category present, order event then announcement; empty array when no rows.

- [ ] **Step 1: Write failing tests** in `tests/events.test.mjs`: `eventTabs` returns `[]` for `[]`; groups two categories into two tabs in order event→announcement; drops nothing; `eventRows` ordering test uses ISO dates `2026-03-01`, `2026-05-01`, `null` → expected order 05-01, 03-01, null. If importing `skeleton-content.ts` through `vm` is impractical because of its imports, put the two pure functions in `src/lib/events.ts` (types imported with `import type` only) and test that file instead; `skeleton-content.ts` then does not change.
- [ ] **Step 2:** Run `node --test tests/events.test.mjs` → FAIL (function not defined).
- [ ] **Step 3:** Implement both functions; day/month via `Intl.DateTimeFormat(lang, { day: 'numeric' })` and `{ month: 'short' }` in UTC; `date` via existing `formatDate`.
- [ ] **Step 4:** Run `node --test tests/events.test.mjs` → PASS; `npm test` → all pass.

### Task 2: Map proof band

**Files:**

- Create: `src/components/skeleton/SkMapProof.astro`
- Modify: `src/styles/skeleton.css`

**Interfaces:**

- Produces: `<SkMapProof lang={Locale} stats={ImpactStat[]} />` — renders nothing when `stats.length === 0`. Lead stat = `stats[0]` shown huge (existing `countsUp`/`data-count-to` markup from `ImpactStats.astro`, `clamp(3.5rem, 1rem+9vw, 8rem)`), its label beneath; map `<img src="/maps/cambodia-phnom-penh.svg" alt="" width=1000 height=896 loading="lazy">` on the other side; remaining stats (`stats.slice(1)`) rendered with existing `<ImpactStats>` below. Text slides up via `data-scrub`/`.reveal` per `docs/17-scroll-motion.md`; map fades in with `--p`.

- [ ] **Step 1:** Build the component and styles (two-column ≥64rem, stacked below; map max-width 560px).
- [ ] **Step 2:** `npm run dev`, open `/` and `/km/` at 1440 and 390; confirm count-up runs, map shows Phnom Penh in red, no horizontal scroll.

### Task 3: Ways-to-help photo cards

**Files:**

- Create: `src/components/skeleton/SkPhotoCards.astro`
- Modify: `src/styles/skeleton.css`

**Interfaces:**

- Consumes: `programCard(program, lang, linkLabel): SkCardItem` from `src/lib/skeleton-content.ts`.
- Produces: `<SkPhotoCards heading={string} items={SkCardItem[]} more={SkAction | null} />` — large photo card per item (aspect 4/5, radius 8, top gradient `rgba(0,0,0,.8)→0`, white title top-left, whole card is the link, image zooms on hover with reduced-motion off); heading left, `more` link right. Items without `image` use the `sk-media` grey fallback. Renders nothing for `items.length === 0`.

- [ ] **Step 1:** Implement; 3–4 columns ≥64rem, horizontal snap-scroll below 40rem.
- [ ] **Step 2:** Visual check both locales at 1440/390.

### Task 4: Events tabs

**Files:**

- Create: `src/components/skeleton/SkEvents.astro`
- Modify: `src/styles/skeleton.css`

**Interfaces:**

- Consumes: `eventRows`, `eventTabs`, `SkEventRow` (Task 1); `categoryLabels` for tab text.
- Produces: `<SkEvents lang={Locale} heading={string} readMore={string} rows={SkEventRow[]} />` — pill tabs (active: 1px ink outline) only when `eventTabs(rows).length > 1`; each row = date block (day over month), title, date, outlined pill link `readMore`. Tabs work without JS by rendering all panels and hiding inactive via a tiny inline script toggling `hidden`; with no JS all panels show. Renders nothing for empty `rows`.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Verify with data having 0, 1, 2 categories (temporarily filter in `SkeletonHome` to simulate); confirm 0 → no section, 1 → no pills.

### Task 5: Stories slider

**Files:**

- Create: `src/components/skeleton/SkStorySlider.astro`
- Modify: `src/styles/skeleton.css`; reuse markup contract of `data-carousel` in `src/lib/carousel.ts` (copy the button/track structure from `src/components/home/StoriesCarousel.astro`).

**Interfaces:**

- Consumes: `Story` (`photo`, `personName`, `personRole`, `quote`, `program`), `storyCard` for text.
- Produces: `<SkStorySlider lang={Locale} heading={string} stories={Story[]} />` — cards 360×457, radius 8, photo with gradient, `personName` + `personRole` overlaid top-left, link to `story.program` page when present; round prev/next buttons; with one story render a single card and no buttons; zero → nothing. Stories without `photo` use the grey `sk-media` fallback with the quote text.

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Check 1 story and 3+ stories; buttons disable at ends; Khmer names don't overflow.

### Task 6: Feature banner and closing card

**Files:**

- Create: `src/components/skeleton/SkFeatureBanner.astro`
- Modify: `src/components/skeleton/SkSplitCta.astro`, `src/styles/skeleton.css`

**Interfaces:**

- Produces: `<SkFeatureBanner lang={Locale} image={CmsImage | null} title={string} titleLang?={string} action={SkAction} />` — full-bleed image (min-height 731px at 1440, `min-height: 70svh` mobile), bottom corners radius 32px, dark overlay, centered white `h2` and white pill; renders nothing without `image`. Home passes the first program that has `image`: title = its title, action = `{ label: tStrict(lang,'learnMore'), href: localizePath('/programs/<slug>', lang) }`.
- `SkSplitCta` gains optional prop `card?: boolean`; when true renders a rounded (radius 24) image card with heading, body and actions over a dark overlay; default markup unchanged for other pages.

- [ ] **Step 1:** Implement both.
- [ ] **Step 2:** Check other pages that use `SkSplitCta` (`grep -rn SkSplitCta src`) are visually unchanged.

### Task 7: Story text scrub and Home assembly

**Files:**

- Modify: `src/components/skeleton/SkStoryText.astro` (add `lang: Locale` prop; paragraph gets `data-scroll-text` and `lang={lang}`; keep plain text), `src/page-templates/skeleton/SkeletonHome.astro`

**Interfaces:**

- Consumes: Tasks 2–6 components, `getActivities()` (replace `getFeaturedActivities(3)` for events; keep featured for `SkPosts`).
- Produces final home order: `SkHero` → `SkStoryText` (mission + story merged: `homeHeroIntro` is the only existing copy; not duplicated) → `SkMapProof` → `SkPhotoCards` (programs) → `SkEvents` → `SkStorySlider` (≥2 stories, else existing `SkStory`) → `SkFeatureBanner` → `SkPosts` → `SkDirector` → partners marquee → `SkSplitCta card`.

- [ ] **Step 1:** Wire the order above; remove the now-unused `SkRows` import on home.
- [ ] **Step 2:** `npm run typecheck` → 0 errors.
- [ ] **Step 3:** View `/` and `/km/` at 1440/390 top to bottom; compare section order against `PAGE_TOPOLOGY.md`.

### Task 8: Nav pill

**Files:**

- Modify: `src/components/layout/Header.astro`, `src/lib/header-scroll.ts`, header rules in `src/styles/global.css` (find with `grep -n "hdr" src/styles/global.css`)

**Interfaces:**

- Consumes: existing `mainNav`, dropdown, mobile menu, `LanguageToggle`, `data-hero-dark` hook.
- Produces: fixed header; logo left; centre pill with main nav + dropdowns (glass `rgba(255,255,255,.2)` + `backdrop-filter: blur` with white text while over `[data-hero-dark]`; light gray `#ddd`-ish pill with ink text otherwise); right side keeps contact link/CTA as a white-on-dark / black pill; logo variant switches (`reversed` over hero, `full` after). Pages without `[data-hero-dark]` start in the light state. Mobile (<64rem) keeps the existing phone menu.

- [ ] **Step 1:** Restyle; keep every existing `data-*` hook used by `menu.ts` / `header-scroll.ts`.
- [ ] **Step 2:** Check `/`, `/about`, `/programs`, `/km/` at 1440 and 390; open a dropdown and the phone menu; keyboard Tab/Esc still work.

### Task 9: Footer

**Files:**

- Modify: `src/components/layout/Footer.astro`, footer rules in `src/styles/global.css`

**Interfaces:**

- Consumes: `footerColumns`, `settings` (address, email, phone, socials), `Logo variant="full"`.
- Produces: light footer (white bg, ink text), four columns (existing `footerColumns` + contact), divider rules, bottom bar with privacy/safeguarding links already in `footerColumns` or `strings`, social icon, `LanguageToggle`, year. No new text. Remove reversed-logo dependency.

- [ ] **Step 1:** Restyle.
- [ ] **Step 2:** Check one page per locale at 1440/390; contrast of links ≥ AA.

### Task 10: Verify and document

**Files:**

- Modify: `docs/03-components-and-wireframes.md` (home section order + new components, one short paragraph each); `docs/17-scroll-motion.md` only if a budget changed.

- [ ] **Step 1:** `npm run check` → tests, typecheck, build, `check-performance` all pass (if JS budget fails, report size, don't raise it silently).
- [ ] **Step 2:** `graphify update .`
- [ ] **Step 3:** Report to the user: what changed, what was skipped (announcement bar, donate widget), anything needing their decision.
