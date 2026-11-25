/**
 * Desktop header motion: the bar slides down into place on load, slides away
 * while the visitor scrolls down and comes back as soon as they scroll up.
 * Phones and reduced motion get a still bar.
 */

const DESKTOP = '(min-width: 75rem)';
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const THRESHOLD = 6;
const LERP = 0.1;
const SNAP = 0.25;
const INTRO = { duration: 1000, easing: 'cubic-bezier(0, 0, 0, 1)' };

export interface ScrollState {
  lastY: number;
  target: number;
}

/** Frame-rate independent smoothing: the same glide at 60Hz or 144Hz. */
export function alphaFromLerp(lerp: number, dtMs: number): number {
  const dt = Math.max(0, Math.min(100, dtMs));
  return 1 - Math.pow(1 - lerp, dt / 16.6667);
}

export function nextTarget(
  state: ScrollState,
  y: number,
  barH: number,
  locked: boolean,
): ScrollState {
  if (locked || y <= THRESHOLD) return { lastY: y, target: 0 };
  const delta = y - state.lastY;
  if (Math.abs(delta) < THRESHOLD) return state;
  let target = state.target;
  if (delta > 0 && y > barH) target = -barH;
  else if (delta < 0) target = 0;
  return { lastY: y, target };
}

const translate = (y: number) => `translate3d(0, ${y}px, 0)`;

export function initHeaderMotion(): void {
  const header = document.querySelector<HTMLElement>('header.site-header');
  if (!header) return;
  const desktop = window.matchMedia(DESKTOP);
  const reduced = window.matchMedia(REDUCED_MOTION);

  let state: ScrollState = { lastY: window.scrollY, target: 0 };
  let current = 0;
  let last = 0;
  let running = false;
  let listening = false;

  const isLocked = () =>
    document.documentElement.hasAttribute('data-menu-open') ||
    !!document.querySelector('[data-dd-toggle][aria-expanded="true"]');

  const place = (y: number) => {
    current = y;
    header.style.transform = translate(y);
  };

  const settle = () => {
    running = false;
    header.style.willChange = '';
    header.toggleAttribute('data-hidden', current < -1);
  };

  const tick = (now: number) => {
    if (!running) return;
    const alpha = alphaFromLerp(LERP, now - last);
    last = now;
    const next = current + (state.target - current) * alpha;
    if (Math.abs(state.target - next) < SNAP) {
      place(state.target);
      settle();
      return;
    }
    place(next);
    requestAnimationFrame(tick);
  };

  const onScroll = () => {
    if (!desktop.matches) return;
    state = nextTarget(state, window.scrollY, header.offsetHeight, isLocked());
    if (state.target === current || running) return;
    running = true;
    header.style.willChange = 'transform';
    last = performance.now();
    requestAnimationFrame(tick);
  };

  const show = () => {
    running = false;
    state = { lastY: window.scrollY, target: 0 };
    place(0);
    header.removeAttribute('data-hidden');
    header.setAttribute('data-loaded', '');
  };

  const listen = () => {
    if (listening) return;
    listening = true;
    window.addEventListener('scroll', onScroll, { passive: true });
  };

  window.addEventListener('pageshow', (event: PageTransitionEvent) => {
    if (event.persisted) show();
  });
  desktop.addEventListener('change', () => {
    show();
    if (!desktop.matches) header.style.transform = '';
  });

  if (!desktop.matches || reduced.matches) {
    header.setAttribute('data-loaded', '');
    if (!reduced.matches) listen();
    return;
  }

  const height = header.getBoundingClientRect().height;
  const intro = header.animate(
    [{ transform: translate(-height) }, { transform: translate(0) }],
    INTRO,
  );
  intro.onfinish = () => {
    intro.cancel();
    show();
    listen();
  };
}
