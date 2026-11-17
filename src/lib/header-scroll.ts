/**
 * The header slides away while reading down and returns on any upward scroll,
 * keyboard focus, or near the top. Distances are measured from the last
 * turning point so a slow scroll still registers.
 */
const HIDE_AFTER = 24;
const SHOW_AFTER = 6;
/** After a jump to an in-page section the header stays put this long, so it never vanishes on arrival. */
const SETTLE_MS = 700;

export function initHeaderScroll(): void {
  const header = document.querySelector<HTMLElement>('header.site-header');
  if (!header) return;

  const menuPanel = document.querySelector<HTMLElement>('[data-mobile-panel]');
  let turnY = window.scrollY;
  let ticking = false;
  let settleUntil = 0;

  const setHidden = (hidden: boolean) => {
    if (header.hasAttribute('data-hidden') !== hidden)
      header.toggleAttribute('data-hidden', hidden);
  };

  const update = () => {
    ticking = false;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const y = Math.min(Math.max(window.scrollY, 0), maxY);
    const hidden = header.hasAttribute('data-hidden');
    header.toggleAttribute('data-scrolled', y > header.offsetHeight);

    if (performance.now() < settleUntil) {
      setHidden(false);
      turnY = y;
      return;
    }

    const nearTop = y < header.offsetHeight * 2;
    const menuOpen = menuPanel ? !menuPanel.hidden : false;
    if (nearTop || menuOpen || header.contains(document.activeElement)) {
      setHidden(false);
      turnY = y;
      return;
    }

    if (hidden ? y > turnY : y < turnY) turnY = y;
    const travelled = y - turnY;
    if (!hidden && travelled > HIDE_AFTER) {
      setHidden(true);
      turnY = y;
    } else if (hidden && travelled < -SHOW_AFTER) {
      setHidden(false);
      turnY = y;
    }
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  const settle = () => {
    settleUntil = performance.now() + SETTLE_MS;
    setHidden(false);
    turnY = window.scrollY;
  };
  if (location.hash) settle();
  window.addEventListener('hashchange', settle);
  window.addEventListener('pageshow', () => location.hash && settle());
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest?.('a[href*="#"]');
    if (link) settle();
  });
  header.addEventListener('focusin', () => header.removeAttribute('data-hidden'));
}
