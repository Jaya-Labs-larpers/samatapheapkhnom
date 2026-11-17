# 17. Scroll motion

Smooth scrolling, plus three ways content can respond to scroll. All of it lives in `src/lib/` and is started
once from `BaseLayout.astro` by `initScrollMotion()`. The first step to a page is always the finished,
static page: no script, reduced motion, or a failed load leaves everything readable.

Demo: `/lab#scroll-motion`.

## Smooth scrolling — `smooth-scroll.ts`

[Lenis](https://github.com/darkroomengineering/lenis) eases mouse-wheel scrolling (`lerp: 0.1`). Touch,
keyboard and scrollbar stay native.

- Loaded on demand (`await import('lenis')`) into its own chunk, after the page script runs.
- Off when the visitor prefers reduced motion (and switches off live if that changes).
- Off site-wide with `PUBLIC_SMOOTH_SCROLL=false` (sets `data-smooth-scroll` on `<html>`).
- `#anchor` links on the same page scroll smoothly, offset by the sticky header's height, then focus the
  target.
- Stops while the phone menu is open (`html[data-menu-open]`).
- A scrollable panel that should keep native wheel scrolling takes `data-lenis-prevent`.
- Torn down on `pagehide`, restarted from the back/forward cache on `pageshow`.

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

JS budget in `scripts/check-performance.mjs` is 12,000 B gzipped (was 8,000) for Lenis (~5.4 KB, lazy chunk)
and these scripts. Tests: `tests/scrub.test.mjs`, `scroll-text.test.mjs`, `smooth-scroll.test.mjs`.
