/**
 * Figures marked [data-count-to] roll up from zero when they come into view,
 * and roll up again each time the visitor scrolls back down to them. A figure
 * is only reset to zero once it is fully below the bottom edge of the window.
 *
 * A figure that is already in view when the page loads waits until the page
 * is actually on screen: after the cross-document view transition has
 * finished, and not while the tab is in the background. Otherwise the roll-up
 * plays behind the outgoing page's snapshot and the visitor meets a number
 * that has already landed.
 *
 * A figure inside a box that is still arriving (see ~/lib/reveal) likewise
 * holds at zero until the box has started to appear, so the roll is seen from
 * its first digit rather than caught half-way. Every figure, whatever its
 * size or unit, rolls on the same two-second clock and easing.
 */

export const COUNT_UP_MS = 2000;
/** How long a held figure waits for its box to appear before rolling anyway. */
export const HOLD_MS = 1500;
/** How long to wait for a `pagereveal` before assuming this load had none. */
const PAGE_REVEAL_GRACE_MS = 400;

const DIGITS = /\d[\d,]*/;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** False while the figure, or a box around it, is still at opacity 0. */
const painted = (figure: HTMLElement): boolean =>
  typeof figure.checkVisibility !== 'function' ||
  figure.checkVisibility({ opacityProperty: true, checkOpacity: true });

function whenRevealed(): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, PAGE_REVEAL_GRACE_MS);
    window.addEventListener(
      'pagereveal',
      (event) => {
        clearTimeout(timer);
        const transition = (event as Event & { viewTransition?: ViewTransition | null })
          .viewTransition;
        if (transition) transition.finished.then(resolve, resolve);
        else resolve();
      },
      { once: true },
    );
  });
}

function whenVisible(): Promise<void> {
  return new Promise((resolve) => {
    if (document.visibilityState !== 'hidden') {
      resolve();
      return;
    }
    const onChange = () => {
      if (document.visibilityState === 'hidden') return;
      document.removeEventListener('visibilitychange', onChange);
      resolve();
    };
    document.addEventListener('visibilitychange', onChange);
  });
}

export function countUpOnEntry(root: ParentNode = document): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof IntersectionObserver !== 'function') return;

  const frames = new Map<HTMLElement, number>();
  const armed = new Set<HTMLElement>();
  const waiting = new Set<HTMLElement>();
  const shown = Promise.all([whenRevealed(), whenVisible()]);

  const reset = (figure: HTMLElement) => {
    cancelAnimationFrame(frames.get(figure) ?? 0);
    frames.delete(figure);
    waiting.delete(figure);
    const template = figure.dataset.countTemplate ?? '';
    figure.textContent = template.replace(DIGITS, '0');
    armed.add(figure);
  };

  const run = (figure: HTMLElement) => {
    armed.delete(figure);
    const target = Number(figure.dataset.countTo);
    const template = figure.dataset.countTemplate ?? '';
    const final = template.match(DIGITS)?.[0] ?? String(target);
    const grouped = final.includes(',');
    const queued = performance.now();
    let start = queued;

    const frame = (now: number) => {
      const progress = Math.min((now - start) / COUNT_UP_MS, 1);
      const current =
        progress === 1
          ? final
          : Math.round(target * easeOutCubic(progress)).toLocaleString('en-US', {
              useGrouping: grouped,
            });
      figure.textContent = template.replace(DIGITS, current);
      if (progress < 1) frames.set(figure, requestAnimationFrame(frame));
      else frames.delete(figure);
    };

    const hold = (now: number) => {
      if (painted(figure) || now - queued >= HOLD_MS) {
        start = now;
        frame(now);
      } else {
        frames.set(figure, requestAnimationFrame(hold));
      }
    };
    frames.set(figure, requestAnimationFrame(hold));
  };

  const startOnceShown = (figure: HTMLElement) => {
    waiting.add(figure);
    shown.then(() => {
      if (waiting.delete(figure)) run(figure);
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const figure = entry.target as HTMLElement;
        if (entry.intersectionRatio >= 0.6) {
          if (armed.has(figure) && !waiting.has(figure)) startOnceShown(figure);
          continue;
        }
        const bottom = entry.rootBounds?.bottom ?? window.innerHeight;
        if (!entry.isIntersecting && entry.boundingClientRect.top >= bottom) reset(figure);
      }
    },
    { threshold: [0, 0.6] },
  );

  for (const figure of root.querySelectorAll<HTMLElement>('[data-count-to]')) {
    const template = figure.textContent ?? '';
    if (!Number.isFinite(Number(figure.dataset.countTo)) || !DIGITS.test(template)) continue;
    figure.dataset.countTemplate = template;
    reset(figure);
    observer.observe(figure);
  }
}
