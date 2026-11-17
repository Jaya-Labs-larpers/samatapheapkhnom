import type Lenis from 'lenis';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const MODIFIERS = ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const;

let lenis: Lenis | null = null;
let starting = false;
let observer: MutationObserver | null = null;

export const smoothScrollWanted = (): boolean =>
  document.documentElement.dataset.smoothScroll === 'on' &&
  !window.matchMedia(REDUCED_MOTION).matches;

const headerHeight = (): number =>
  document.querySelector<HTMLElement>('header.site-header')?.offsetHeight ?? 0;

function onAnchorClick(event: MouseEvent): void {
  if (!lenis || event.defaultPrevented || event.button !== 0) return;
  if (MODIFIERS.some((key) => event[key])) return;
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
  if (!link || link.origin !== location.origin || link.pathname !== location.pathname) return;
  const id = decodeURIComponent(link.hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  event.preventDefault();
  lenis.scrollTo(target, { offset: -headerHeight() });
  history.pushState(null, '', link.hash);
  target.focus({ preventScroll: true });
}

function syncMenuLock(): void {
  if (!lenis) return;
  if (document.documentElement.hasAttribute('data-menu-open')) lenis.stop();
  else lenis.start();
}

function teardown(): void {
  observer?.disconnect();
  observer = null;
  document.removeEventListener('click', onAnchorClick);
  lenis?.destroy();
  lenis = null;
}

async function start(): Promise<void> {
  if (lenis || starting || !smoothScrollWanted()) return;
  starting = true;
  const { default: Lenis } = await import('lenis');
  starting = false;
  if (lenis || !smoothScrollWanted()) return;
  lenis = new Lenis({ lerp: 0.1, autoRaf: true });
  document.addEventListener('click', onAnchorClick);
  observer = new MutationObserver(syncMenuLock);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-menu-open'],
  });
  syncMenuLock();
}

export function initSmoothScroll(): void {
  void start();
  const reduced = window.matchMedia(REDUCED_MOTION);
  reduced.addEventListener('change', () => (reduced.matches ? teardown() : void start()));
  window.addEventListener('pagehide', teardown);
  window.addEventListener('pageshow', (event) => event.persisted && void start());
}
