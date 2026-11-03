/**
 * Content boxes (.reveal) rise into place from below as they come into view,
 * and again every time the visitor scrolls back down to them.
 *
 * Time-based rather than scroll-linked: a mouse wheel scrolls in steps, and an
 * animation tied to scroll position steps with it. A fixed-length transition
 * started on entry is smooth whatever the input.
 *
 * A box is only ever set aside while it is fully below the bottom edge of the
 * window, so the visitor never watches one disappear. Boxes already in view at
 * load are left alone until they have scrolled off the bottom once. Without
 * IntersectionObserver, or under reduced motion, nothing is touched at all.
 */

/** Must match --reveal-move in global.css. */
export const REVEAL_MS = 900;
/** Boxes arriving together are staggered by this much, up to STAGGER_CAP of them. */
export const STAGGER_MS = 90;
const STAGGER_CAP = 4;

interface Options {
  root?: ParentNode;
  viewportHeight?: number;
  reducedMotion?: boolean;
}

export function revealOnEntry({
  root = document,
  viewportHeight = window.innerHeight,
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches,
}: Options = {}): void {
  if (reducedMotion || typeof IntersectionObserver !== 'function') return;

  const boxes = Array.from(root.querySelectorAll<HTMLElement>('.reveal'));
  if (boxes.length === 0) return;

  const handBack = new Map<HTMLElement, ReturnType<typeof setTimeout>>();

  const arrival = new IntersectionObserver(
    (entries) => {
      const arriving = entries.filter((entry) => entry.isIntersecting);
      arriving.forEach((entry, index) => {
        const box = entry.target as HTMLElement;
        arrival.unobserve(box);
        const delay = Math.min(index, STAGGER_CAP) * STAGGER_MS;
        const length = Number(box.dataset.revealMs) || REVEAL_MS;
        box.style.setProperty('--reveal-delay', `${delay}ms`);
        box.dataset.reveal = 'shown';
        // Hand the box back to its own styles afterwards, so a card's hover
        // transitions are not overridden by the reveal's.
        handBack.set(
          box,
          setTimeout(
            () => {
              handBack.delete(box);
              delete box.dataset.reveal;
              box.style.removeProperty('--reveal-delay');
            },
            delay + length + 50,
          ),
        );
      });
    },
    // Starts once a box is properly on screen, not while it is still hidden
    // behind the bottom edge, so the visitor actually sees it arrive.
    { rootMargin: '0px 0px -8% 0px', threshold: 0.1 },
  );

  const setAside = (box: HTMLElement) => {
    clearTimeout(handBack.get(box));
    handBack.delete(box);
    box.style.removeProperty('--reveal-delay');
    box.dataset.reveal = 'pending';
    arrival.observe(box);
  };

  const departure = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) continue;
      const bottom = entry.rootBounds?.bottom ?? window.innerHeight;
      if (entry.boundingClientRect.top >= bottom) setAside(entry.target as HTMLElement);
    }
  });

  for (const box of boxes) {
    if (box.getBoundingClientRect().top > viewportHeight) setAside(box);
    departure.observe(box);
  }
}
