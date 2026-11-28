/**
 * Content rises into place as it comes into view, once. Two looks share this
 * lifecycle: `.reveal` boxes and section headings rise 30px and fade in;
 * `.clip-reveal` media unfold from their top-left corner (clip, scale and
 * fade, see global.css).
 *
 * A box is only ever set aside while it is fully below the bottom edge of the
 * window, so the visitor never watches one disappear. Boxes already in view
 * at load are left alone. Phones animate only the boxes that opt in with
 * data-reveal-mobile. Without IntersectionObserver, or under reduced motion,
 * nothing is touched at all.
 */

/** Must match --reveal-move in global.css. */
export const REVEAL_MS = 1000;
/** Must match --clip-move in global.css. */
export const CLIP_MS = 1500;
/** Boxes arriving together are staggered by this much, up to STAGGER_CAP of them. */
export const STAGGER_MS = 90;
const STAGGER_CAP = 4;
const PHONE = '(width < 62rem)';
/** Section headings rise on their own unless a revealing box already carries them. */
const TARGETS = '.reveal, .clip-reveal, main h2:not(.sr-only)';

interface Options {
  root?: ParentNode;
  viewportHeight?: number;
  reducedMotion?: boolean;
  phone?: boolean;
}

export function revealOnEntry({
  root = document,
  viewportHeight = window.innerHeight,
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  phone = window.matchMedia(PHONE).matches,
}: Options = {}): void {
  if (reducedMotion || typeof IntersectionObserver !== 'function') return;

  const boxes = Array.from(root.querySelectorAll<HTMLElement>(TARGETS)).filter(
    (box) =>
      (!phone || box.dataset.revealMobile === 'true') &&
      !box.parentElement?.closest('.reveal, .clip-reveal'),
  );
  if (boxes.length === 0) return;

  const arrival = new IntersectionObserver(
    (entries) => {
      const arriving = entries.filter((entry) => entry.isIntersecting);
      arriving.forEach((entry, index) => {
        const box = entry.target as HTMLElement;
        arrival.unobserve(box);
        const explicit = Number(box.dataset.revealDelay);
        const delay =
          Number.isFinite(explicit) && box.dataset.revealDelay
            ? explicit
            : Math.min(index, STAGGER_CAP) * STAGGER_MS;
        const length =
          Number(box.dataset.revealMs) ||
          (box.classList.contains('clip-reveal') ? CLIP_MS : REVEAL_MS);
        box.style.setProperty('--reveal-delay', `${delay}ms`);
        box.dataset.reveal = 'shown';
        // Hand the box back to its own styles afterwards, so a card's hover
        // transitions are not overridden by the reveal's.
        setTimeout(
          () => {
            delete box.dataset.reveal;
            box.style.removeProperty('--reveal-delay');
          },
          delay + length + 50,
        );
      });
    },
    // Starts once a box is properly on screen, not while it is still hidden
    // behind the bottom edge, so the visitor actually sees it arrive.
    { rootMargin: '0px 0px -10% 0px', threshold: 0 },
  );

  for (const box of boxes) {
    if (box.getBoundingClientRect().top <= viewportHeight) continue;
    box.dataset.reveal = 'pending';
    arrival.observe(box);
  }
}
