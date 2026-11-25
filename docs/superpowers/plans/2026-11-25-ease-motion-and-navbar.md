# Ease-style Motion, CTA and Navbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the header, CTA buttons and scroll animations on the engineering of easehealth.com, keeping SKO colours, fonts and copy.

**Architecture:** Small, single-purpose modules in `src/lib/` started from `BaseLayout.astro` / `Header.astro`, matching the existing `reveal.ts` / `scrub.ts` pattern. Pure logic is exported and unit-tested with the repo's `vm` + `typescript.transpileModule` harness. The visuals live in CSS and use existing tokens only.

**Tech Stack:** Astro 7, Tailwind 4 + plain CSS, TypeScript, Lenis 1.3.27 (already installed), Web Animations API, IntersectionObserver. No new dependencies.

**Spec:** this document's "Reference teardown" (taken from easehealth.com source, 2026-11-25) plus the user's request: "apply the same animation, scrolling javascript, cta button design, (NO color copy, use ours), and redo the navbar use their design".

## Global Constraints

- Colours: existing tokens only (`--color-blue-*`, `--color-ink-*`, `--color-line*`). No Ease greens/sage/slate/keylime.
- Solid CTAs: `--color-blue-700` bg, `--color-blue-800` hover, white text. No white solid buttons.
- Fonts: `var(--font-sans)` UI/nav/buttons, `var(--font-serif)` body. No new families.
- No new npm packages. Ease uses GSAP, Locomotive and jQuery; we rebuild what they do with WAAPI, IO and the Lenis we already ship.
- Everything readable with no JS and under `prefers-reduced-motion: reduce` (final state, no motion).
- Bilingual: Khmer labels are longer. Nothing may truncate or overlap at 1200–1440px in `km`.
- No copy, names or claims invented. Dropdown content comes from `nav.ts` and Sanity only.
- No comments unless they explain a non-obvious reason (AGENTS.md).
- After code changes: `graphify update .`. Full gate: `npm run check`.

## Reference teardown (easehealth.com)

Stack: Webflow export served by Next. GSAP+ScrollTrigger loaded but the motion is custom vanilla JS in `/assets/js/eh-webflow-replace.js` plus inline scripts. Desktop-only (≥992px) for most motion.

**Navbar**
- `position: fixed; top: 0`, solid page-background colour, min-height 6rem, side padding 2.5rem (1.5rem tablet, 1rem phone).
- Grid `0.5fr 1fr 0.5fr`: logo left, links centred, CTA right. Max-width 103rem.
- Link: padding `.5rem .75rem`, hover `opacity: .6` over `.3s cubic-bezier(.215,.61,.355,1)`. No underline.
- Dropdown toggle: label + chevron, padding `.5rem 1rem`, radius `.5rem`. On open the toggle gets a tinted fill, the chevron turns `rotateZ(180deg)`, and the panel fades `opacity 400ms ease`. Toggle bg and chevron also animate over 400ms.
- Hover opens instantly. Close waits for the 400ms fade, then removes the open class. Esc closes and refocuses the toggle. Focus-out and an outside click close it. The bar never hides while a dropdown is open.
- Panel: full width under the bar, `padding-top 1.75rem`. Inner card: 1px border, radius 1rem, bg, `padding 2.5rem`, `box-shadow 0 4px 12px #0000000d`, max-width 89.5rem.
- Panel grid columns: a top row with a 2.5rem square icon tile (radius .5rem, tint bg), a dashed 1px line and an arrow at its end. Then the title link, then muted sub-links (`opacity .6` → 1 on hover, gap 1.25rem).
- Image tile at the right of the panel. Hovering a column crossfades two stacked images (`opacity 400ms cubic-bezier(.22,1,.36,1)`). Images are preloaded and decoded before the fade, and the latest request wins.
- Intro (desktop): the bar starts at `translateY(-height)` and slides to 0 with WAAPI, `1000ms cubic-bezier(0,0,0,1)`. It is `visibility:hidden` until JS runs.
- Scroll hide/show (desktop):
  - Hides when scrolling down past the bar's height and shows when scrolling up.
  - Ignores deltas under 6px and always shows within 6px of the top.
  - Moves by frame-rate-independent lerp, `alpha = 1 - (1-0.1)^(dt/16.6667)` with dt clamped to 0–100ms. It snaps when within 0.25px.
  - At rest it gets `navbar--hidden` (pointer-events none).
- Phone: an in-bar compact CTA (`padding .875rem`, `font-size .875rem`) sits beside the hamburger.
  - Hamburger: 3 lines, 18×2px with 3px gaps. When open, the top line goes `translate(0,5px) rotate(45deg)`, the middle fades out and the bottom goes `translate(0,-5px) rotate(-45deg)`, all over 400ms.
  - The menu is a full-height overlay that fades `opacity 400ms` and locks body scroll.
  - Accordions open instantly. Touch targets are at least 44px.

**CTA**
- `.button`: 1px border in the bg colour, radius 1rem (rounded rectangle, not a pill), `padding 1rem 1.5rem`, `line-height 1`, nowrap. bg and border transition `.3s cubic-bezier(.215,.61,.355,1)`, hover → darker shade.
- Secondary: transparent bg, light-grey border, hover fills with the border tint.
- Hero "grid-button" tile: radius 1rem, `padding 3rem` (2rem phone), flex space-between, large label left, arrow icon right (larger on desktop). Hover → darker bg. It enters with the clip reveal.

**Scroll / animation**
- Smooth scroll: Locomotive v5 (a Lenis wrapper), `lerp 0.1`. Desktop ≥992 only, wheel only (`smoothWheel: !isTouch`, no touch smoothing).
- `[data-reveal]` clip reveal (media, tiles, CTA). The element is wrapped in `.reveal-wrap` and animated with WAAPI:
  - clip-path `inset(0 10% 10% 0 round R)` → `inset(0 round R)`, 1500ms `cubic-bezier(.2,0,.2,1)`
  - opacity 0→1, 1150ms `cubic-bezier(.6,0,.2,1)`
  - wrap scale .9→1 and inner counter-scale 1.1111→1, 1500ms `cubic-bezier(0,0,0,1)`
  - delay from `data-reveal-delay` (300–700ms seen). Trigger is IO `rootMargin 0 0 -10% 0`, plays once.
  - A `[data-reveal-parent]` group fires all its children together. Elements already in view (top < 75% of the viewport) play on load.
- `[data-animate-in]` text rise: `opacity 0; translateY(30px)` → 0, `opacity 1s ease, transform 1s cubic-bezier(0,0,0,1)`. Per-element delay via `data-animate-in-delay` (hero: 300, 450, 600 … 1300ms). IO `rootMargin 0 0 -25% 0`, plays once. Parent groups use -10%.
- Phone: reveals and rises are off unless the element opts in (`data-*-mobile="true"`).
- Other patterns (optional, Task 7):
  - Pinned "problem → solution": a 220vh section with a 100vh sticky stage. Scroll progress scrubs a Lottie. At 50% the two blocks crossfade and the stage bg changes (800ms `cubic-bezier(.2,0,.2,1)`).
  - Horizontal card track: a 300vh section whose track moves `translateX(-distance*progress)`.
  - Vertical "lift" ticker: the centred item scales 1.2 over 1000ms `cubic-bezier(.5,0,0,1)`, with a 500ms pause between moves.
  - Logo marquee: CSS keyframes, 24s linear.
  - Every loop pauses off-screen and on `visibilitychange`.

## Decisions (signed off by user 2026-11-25)

1. **Solid header bar**: solid white bar, static colour, never recolours over dark sections. Full-colour logo always. Tone system deleted.
2. **CTA shape**: 1rem rounded rectangle site-wide (replaces 999px pills), still blue.
3. **Reveal**: plays once.
4. **Dropdown images**: only the Work dropdown gets the image tile (program `cardImage ?? image`).
5. **Coverage**: the new header, CTA and motion must fit every page (home, about + subpages, programs + detail, impact + projects, activities + detail, team, partners, reports, faq, safeguarding, contact, donate, legal/privacy, lab, minimal-header pages). The custom 404 is excluded and left as is.

## Review Focus

1. Khmer labels at 1200px: the three centred links plus the language toggle plus the CTA must fit without overlap. Test: Task 3 Step 4 checks `km` at 1200px.
2. Scroll-hide while the phone menu or a dropdown is open: the bar must stay visible. Test: Task 2 `keeps the bar shown while a menu is open`.
3. Anchor jumps (`#section`) under the hidden bar: the Lenis offset must not leave the target behind a bar that slides back in. Test: Task 2 `shows the bar on upward jumps`. Lenis anchor offset is unchanged.
4. Reduced motion: no intro slide, no lerp, no reveal or rise, and everything visible. Tests: Tasks 2 and 5 `reduced motion` cases.
5. bfcache return (`pageshow` persisted): the bar must not stay hidden or invisible. Test: Task 2 `reset on pageshow`.

---

### Task 1: CTA buttons → Ease shape, SKO colours

**Files:**
- Modify: `src/styles/global.css:441-500` (`.btn*`)
- Modify: `src/components/layout/Header.astro` (`.hdr__pill`, `.mega__pill`)
- Modify: `src/components/home/Hero.astro` (`.hero__btn*`)
- Modify: `src/styles/theme.css` (add tokens)

**Interfaces:**
- Produces:
  - tokens `--radius-cta: 1rem` and `--ease-ui: cubic-bezier(0.215, 0.61, 0.355, 1)`
  - class `.btn-tile` (large CTA tile) with child `.btn-tile__arrow`

- [ ] **Step 1:** Add `--radius-cta: 1rem` and `--ease-ui: cubic-bezier(0.215, 0.61, 0.355, 1)` to `theme.css`.
- [ ] **Step 2:** Update `.btn`:
  - `border-radius: var(--radius-cta)`, `padding: 1rem 1.5rem`, `line-height: 1`, 1px border = bg colour
  - transition `background-color, border-color 300ms var(--ease-ui)`
  - Drop the hover box-shadow. `.btn-primary` border tracks bg (blue-700 → blue-800).
- [ ] **Step 3:** Update `.btn-secondary`: transparent bg, `--color-line-strong` border, hover bg `--color-blue-50`. Same radius and transition.
- [ ] **Step 4:** Apply the same shape to `.hdr__pill`, `.mega__pill` and `.hero__btn--solid/--outline`. Remove `border-radius: 999px` and the `padding` transition.
- [ ] **Step 5:** Add `.btn-tile`:
  - flex, space-between, gap 1.5rem, `padding: clamp(2rem, 4vw, 3rem)`
  - radius `--radius-cta`, bg blue-700, white, hover blue-800 over 300ms `--ease-ui`
  - label `font-size: clamp(1.25rem, 2vw, 1.5rem)`, `font-weight: 500`
  - `.btn-tile__arrow` is an inline SVG arrow, 27×24 phone and 42×38 ≥64rem
- [ ] **Step 6:** Run `npm run build`. Expected: passes, including `check-performance`.
- [ ] **Step 7:** Visual check at localhost:4321 with the T3 `preview_*` tools: `/`, `/contact`, `/about`. All solid CTAs are blue rounded rectangles.
- [ ] **Step 8:** Commit `feat(ui): Ease-shaped CTA buttons in brand blue`.

### Task 2: Header motion — intro slide + lerp scroll hide/show

**Files:**
- Create: `src/lib/header-motion.ts`
- Create: `tests/header-motion.test.mjs` (same harness as `tests/reveal.test.mjs`)
- Delete: `src/lib/header-scroll.ts` (decision 1)
- Modify: `src/components/layout/Header.astro` script block

**Interfaces:**
- Produces:
  - `alphaFromLerp(lerp: number, dtMs: number): number`
  - `nextTarget(state: { lastY: number; target: number }, y: number, barH: number, locked: boolean): { lastY: number; target: number }`
    - `target` is `0` (shown) or `-barH` (hidden)
  - `initHeaderMotion(): void`, desktop (`(min-width: 75rem)`) only

- [ ] **Step 1: Write failing tests:**
  - `alphaFromLerp(0.1, 16.6667)` ≈ `0.1`, `alphaFromLerp(0.1, 0) === 0` and `alphaFromLerp(0.1, 500) === alphaFromLerp(0.1, 100)` (dt clamp)
  - `hides after passing the bar`: `nextTarget({lastY:100,target:0}, 200, 90, false).target === -90`
  - `ignores small deltas`: `nextTarget({lastY:200,target:-90}, 204, 90, false)` returns the same state
  - `always shows near top`: y=5 → target 0
  - `shows the bar on upward jumps`: lastY 900 → y 400 → target 0
  - `keeps the bar shown while a menu is open`: locked=true, y down by 300 → target 0
  - `reduced motion`: `initHeaderMotion` with matchMedia reduce → no `animate()` call, `data-loaded` set at once
  - `reset on pageshow`: after a persisted `pageshow` the header has `data-loaded` and transform `translate3d(0,0,0)`
- [ ] **Step 2:** Run `node --test tests/header-motion.test.mjs`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** with these values:
  - threshold 6px, lerp 0.1, snap 0.25px
  - intro uses `header.animate([{transform:'translate3d(0,-H px,0)'},{transform:'translate3d(0,0,0)'}], {duration:1000, easing:'cubic-bezier(0,0,0,1)'})`, then sets `data-loaded`
  - `locked` = any `[data-dd-toggle][aria-expanded="true"]` or `html[data-menu-open]`
  - at rest when hidden, set `data-hidden` (CSS: `pointer-events:none`)
  - one rAF loop that runs only while moving
  - reads `window.scrollY`, which Lenis keeps current
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Header CSS:
  - `.hdr` becomes `position: fixed; inset-inline: 0; top: 0`
  - add `padding-top: var(--header-h)` on `body` (or `main`)
  - desktop `.hdr:not([data-loaded]) { visibility:hidden }` only inside `@media (scripting: enabled) and (min-width: 75rem)`, so no-JS shows it
- [ ] **Step 6:** Replace `initHeaderScroll()` with `initHeaderMotion()`. Delete `header-scroll.ts` and every `data-tone` / `data-brand-tone` / `data-hero-dark` header rule. Update the header transition test from commit 35bdc42 (`grep -rn "tone" tests`) to the new behaviour.
- [ ] **Step 7:** Run `npm test && npm run typecheck`. Expected: PASS.
- [ ] **Step 8:** Commit `feat(header): Ease intro slide and lerp scroll hide/show`.

### Task 3: Navbar redesign — bar, links, dropdown mega panel, phone menu

**Files:**
- Modify: `src/components/layout/Header.astro` (markup + `<style>`)
- Modify: `src/lib/menu.ts` (timings, hamburger state)

**Interfaces:**
- Consumes: `.btn` shape from Task 1, `data-loaded` / `data-hidden` from Task 2
- Produces: per-column markup `.dd__col > .dd__top(.dd__icon, .dd__line) + .dd__title + .dd__links`, and `.dd__media` (image slot for Task 4)

- [ ] **Step 1: Bar.**
  - solid `#fff` bg, 1px bottom `--color-line` once scrolled past the top, side padding `clamp(16px, 2.5vw, 40px)`
  - `.hdr__bar` becomes a `grid-template-columns: 0.5fr 1fr 0.5fr` grid (logo / centred nav / tools right), max-width 1360px
  - remove the frosted `.hdr__nav` surface
- [ ] **Step 2: Links and toggles.**
  - `.hdr__link` padding `.5rem .75rem`, hover/current `opacity .6` over 300ms `--ease-ui`
  - remove the `::after` underline, and keep `aria-current` bold (`font-weight 600`)
  - link + chevron form one toggle area: padding `.5rem 1rem`, radius `.5rem`
  - open state: bg `--color-blue-50`, chevron `rotate(180deg)`, both over 400ms ease
- [ ] **Step 3: Mega panel.**
  - `.dd` spans the full bar width, `padding-top: 1.75rem`
  - `.dd__inner`: 1px `--color-line` border, radius 1rem, white, `padding 2.5rem`, `box-shadow 0 4px 12px rgb(0 0 0 / .05)`, max-width 89.5rem
  - fade only (`opacity 400ms ease`), no slide
  - columns: one per link for Work (program title = `.dd__title`, no sub-links); About and Impact are a single column of `.dd__title` links
  - `.dd__icon`: 2.5rem square, radius .5rem, bg `--color-blue-50`, holding the existing arrow icon
  - `.dd__line`: 1px dashed `--color-line-strong`, with the arrow at its right end
  - muted links `opacity .6` → 1
  - `menu.ts`: open delay 0 (was 60), close delay 300ms (was 160), and keep the `data-open` attribute until the 400ms fade ends
- [ ] **Step 4: Phone (<75rem).**
  - the bar shows logo, compact CTA (`padding .875rem`, `font-size .875rem`, Contact us) and hamburger
  - hamburger is 3 `<span>` lines, 18×2px with 3px gaps, at least a 44px hit area
  - `[aria-expanded=true]` morphs it per the teardown values over 400ms
  - `.mmenu` fades `opacity 400ms ease`, with no slide; scroll lock as today
  - remove the separate close button and let the bar's hamburger close the menu; keep the focus trap in `menu.ts`
- [ ] **Step 5:** Run `npm run typecheck && npm test`. Expected: PASS.
- [ ] **Step 6:** Visual check with T3 preview at 390, 768, 1200 and 1440 widths, `en` + `km`:
  - no overlap or truncation
  - dropdown keyboard path: Tab → Enter → ArrowDown → Esc
  - phone menu open/close
- [ ] **Step 7:** Commit `feat(header): Ease-style navbar and mega dropdown`.

### Task 4: Work dropdown image crossfade

**Files:**
- Create: `src/lib/nav-image-swap.ts`
- Create: `tests/nav-image-swap.test.mjs`
- Modify: `src/components/layout/Header.astro` (Work `.dd__media` with two stacked `<img>`, `data-swap-src` on each column)

**Interfaces:**
- Consumes: `.dd__col[data-swap-src]` and `.dd__media` from Task 3; `ResponsiveImage` / Sanity image URL helper already used by program cards
- Produces: `createSwapQueue(run: (src: string) => Promise<void>): (src: string) => void` (latest request wins, nothing runs in parallel) and `initNavImageSwap(): void`

- [ ] **Step 1: Failing tests:**
  - `latest request wins`: request a, b, c while a runs → the runs are `[a, c]`
  - `same src twice is a no-op`
- [ ] **Step 2:** Run `node --test tests/nav-image-swap.test.mjs`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - fade 400ms `cubic-bezier(.22,1,.36,1)` between the two imgs
  - `img.decode()` before the fade, then swap the front/back roles
  - desktop only; on phone, hide `.dd__media`
  - the default image is the first program's
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit `feat(header): crossfade program image in Work dropdown`.

### Task 5: Reveal systems — clip reveal + text rise

**Files:**
- Create: `src/lib/clip-reveal.ts`
- Create: `tests/clip-reveal.test.mjs`
- Modify: `src/lib/reveal.ts`, `tests/reveal.test.mjs`, `src/styles/global.css:190-260`
- Modify: `src/layouts/BaseLayout.astro` (start `clipReveal()`)

**Interfaces:**
- Produces:
  - `clipReveal(opts?: { root?: ParentNode; reducedMotion?: boolean; phone?: boolean }): void` for `[data-clip-reveal]` (`data-clip-delay`, `data-clip-mobile`) and parents `[data-clip-parent]`
  - `.reveal` keeps its class name and `data-reveal-delay`/`data-reveal-ms`, and gains `data-reveal-mobile`

- [ ] **Step 1: Failing tests (clip-reveal):**
  - `animates clip, opacity and scale with Ease values`: the stub `animate` records keyframes `inset(0 10% 10% 0 round 16px)` → `inset(0 0 0 0 round 16px)` with duration 1500 and easing `cubic-bezier(0.2, 0, 0.2, 1)`; opacity 1150 / `cubic-bezier(0.6, 0, 0.2, 1)`; wrap scale `0.9`→`1` and inner `1.1111`→`1` at 1500 / `cubic-bezier(0, 0, 0, 1)`; delay = `data-clip-delay`
  - `plays once`: the element is unobserved after it intersects
  - `parent fires all children`
  - `reduced motion`: no `animate` call and the element is visible
  - `phone skips unless opted in`
- [ ] **Step 2: Failing tests (reveal):**
  - `rises once` (no re-pending after leaving the bottom)
  - pending state uses a 30px rise
  - `phone skips unless data-reveal-mobile`
- [ ] **Step 3:** Run `node --test tests/clip-reveal.test.mjs tests/reveal.test.mjs`. Expected: FAIL.
- [ ] **Step 4: Implement.**
  - `clip-reveal.ts` wraps each element in `.clip-wrap`, copying the radius and margins from the element as the Ease `syncWrapToEl` does. A ResizeObserver resyncs the radius.
  - IO `rootMargin '0px 0px -10% 0px'`; elements whose top is within 75% of the viewport play on load.
  - `reveal.ts`: drop the departure observer and use IO `rootMargin '0px 0px -25% 0px'`.
  - CSS: `--reveal-rise: 30px`, opacity `1s ease`, translate `1s cubic-bezier(0,0,0,1)`, delay `var(--reveal-delay)`.
  - keep the existing stagger when no `data-reveal-delay` is set.
  - no-JS: elements visible (pending state is only ever set by JS).
- [ ] **Step 5:** Run `npm test`. Expected: PASS.
- [ ] **Step 6:** Commit `feat(motion): Ease clip reveal and 30px text rise`.

### Task 6: Smooth scroll gating

**Files:**
- Modify: `src/lib/smooth-scroll.ts`, `tests/smooth-scroll.test.mjs`

**Interfaces:**
- Changes `smoothScrollWanted()` to also require `(min-width: 62rem)` and `not ((hover: none) and (pointer: coarse))`. Lenis options are unchanged: `lerp: 0.1`.

- [ ] **Step 1:** Failing tests `off on touch-only devices` and `off below 62rem`.
- [ ] **Step 2:** Run `node --test tests/smooth-scroll.test.mjs`. Expected: FAIL.
- [ ] **Step 3:** Implement it, and tear down / restart on a change to that media query, as is already done for reduced motion.
- [ ] **Step 4:** Run the tests. Expected: PASS. Then commit `feat(motion): smooth wheel scroll on desktop only`.

### Task 7: Apply motion to pages

**Files:**
- Modify: `src/components/home/Hero.astro`, `src/components/home/*.astro`, `src/components/page/PageHero.astro`, `src/components/content/*Card.astro`, `src/components/content/CtaBand.astro`, `src/components/home/ClosingCta.astro`

- [ ] **Step 1: Home hero.**
  - title `.reveal data-reveal-delay="300" data-reveal-mobile="true"`, lead 450, actions 600
  - hero image / butterfly field `data-clip-reveal data-clip-delay="300" data-clip-mobile="true"`
- [ ] **Step 2: Section heads.** Eyebrow at delay 300 and heading at 450, inside a parent group.
- [ ] **Step 3: Cards and images.** Card media gets `data-clip-reveal`, card text `.reveal`; grids use `data-clip-parent` with delays 300/400/500 per column.
- [ ] **Step 4: Closing CTA.** `ClosingCta` and `CtaBand` primary action becomes `.btn-tile` with `data-clip-reveal data-clip-delay="600"`.
- [ ] **Step 5:** Run `npm run check`. Expected: PASS (tests, typecheck, build, performance budget).
- [ ] **Step 6:** Visual pass with T3 preview on `/`, `/about`, `/programs`, `/impact` at 390 and 1440, with reduced motion on and off.
- [ ] **Step 7:** Update `docs/17-scroll-motion.md` (new attributes, values, decisions 1–3) and run `graphify update .`.
- [ ] **Step 8:** Commit `feat(motion): apply Ease reveals across pages`.

**Optional (Phase 2, only on request):** pinned problem→solution section, horizontal card track and lift ticker. `scroll-steps.ts` and `scrub.ts` already cover the mechanics. Each needs content the owner signs off.
