# 17. Scroll motion

Smooth scrolling, plus three ways content can respond to scroll. All of it lives in `src/lib/` and is started
once from `BaseLayout.astro` by `initScrollMotion()`. The first step to a page is always the finished,
static page: no script, reduced motion, or a failed load leaves everything readable.

Demo: `/lab#scroll-motion`.

## Smooth scrolling — `smooth-scroll.ts`

[Lenis](https://github.com/darkroomengineering/lenis) eases mouse-wheel scrolling (`lerp: 0.1`). Touch,
keyboard and scrollbar stay native.

- Loaded on demand (`await import('lenis')`) into its own chunk, after the page script runs.
- Off when the visitor prefers reduced motion, below 62rem, or on touch-only devices (as on easehealth.com);
  switches live if any of those change.
- Off site-wide with `PUBLIC_SMOOTH_SCROLL=false` (sets `data-smooth-scroll` on `<html>`).
- `#anchor` links on the same page scroll smoothly, offset by the sticky header's height, then focus the
  target.
- Stops while the phone menu is open (`html[data-menu-open]`).
- A scrollable panel that should keep native wheel scrolling takes `data-lenis-prevent`.
- Torn down on `pagehide`, restarted from the back/forward cache on `pageshow`.

## Reveal — `reveal.ts` (easehealth.com's motion)

Plays once. Nothing on screen at load is hidden by script; phones (<62rem) animate only what carries
`data-reveal-mobile="true"`. Reduced motion: nothing moves.

| Hook                        | Look                                                                             |
| --------------------------- | -------------------------------------------------------------------------------- |
| `.reveal`, every `main h2`  | fade 1s `ease` + rise 30px over 1s `cubic-bezier(0,0,0,1)`                       |
| `.clip-reveal`              | unfold: clip `inset(0 10% 10% 0)`→0 1.5s, fade 1.15s, scale .9→1 (child 1.111→1) |
| `.load-rise` / `.load-clip` | same looks as CSS animations on load, for heroes (`style="--load-delay:300ms"`)  |
| `data-reveal-delay="450"`   | explicit delay in ms; otherwise boxes arriving together stagger by 90ms          |

## Header — `header-motion.ts`

Desktop (≥75rem): slides down from above on load (1000ms `cubic-bezier(0,0,0,1)`), hides while scrolling down
past its height, returns on any upward scroll (6px threshold, frame-rate independent lerp 0.1), stays shown
while a drop-down or the phone menu is open. Phones and reduced motion: a still bar.

## Scrub — `scrub.ts`

`[data-scrub]` elements get `--p`, from 0 to 1, while they scroll through the window.

| Attribute          | Default     | Meaning                                      |
| ------------------ | ----------- | -------------------------------------------- |
| `data-scrub-start` | `top 100%`  | `<element edge> <window %>` where `--p` is 0 |
| `data-scrub-end`   | `bottom 0%` | `<element edge> <window %>` where `--p` is 1 |

The script only writes the number. What it does is CSS: `translate: 0 calc(var(--p, 1) * -40px)`. Always
write `var(--p, 1)` so that without the script the element sits in its finished state.

## Written-out text — `scroll-text.ts`

`<p data-scroll-text lang="…">` darkens unit by unit from `--color-ink-400` to `--color-ink-900` as it scrolls
from 70% to 70% of the window. The dim colour is the AA-contrast one, so unread text is still readable.

- Plain text only (an element with child elements is skipped).
- Latin: per character, inside words that never break. Khmer: per word (`Intl.Segmenter`), because Khmer
  letters stack into clusters and have no spaces. The unit follows the element's `lang`.
- The element gets `aria-label` with the full text; the pieces are `aria-hidden`.

## Steps — `scroll-steps.ts`

```html
<div data-scroll-steps>
  <div data-panel="0">…</div>
  <div data-panel="1">…</div>
  <section data-step>…</section>
  <section data-step>…</section>
</div>
```

The step crossing the middle of the window gets `data-active`; the container gets `data-active-step="<n>"`
and fires a `scrollstep` event (`detail: { index, step }`). Show and hide panels in CSS
(`[data-active-step='1'] [data-panel='1']`). Every panel and step stays in the HTML so search, screen readers
and Ctrl+F find all of it; with no `data-active-step` (no JS) show them all.

## Budgets

JS budget in `scripts/check-performance.mjs` is 13,000 B gzipped (was 12,000 before the Ease header: motion,
menu and drop-down photo scripts); CSS 17,000 B. Tests: `tests/scrub.test.mjs`, `scroll-text.test.mjs`,
`smooth-scroll.test.mjs`, `reveal.test.mjs`, `header-motion.test.mjs`, `menu.test.mjs`,
`nav-image-swap.test.mjs`.
