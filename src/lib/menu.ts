/** Phone menu under the bar: its menu button toggles it, Esc closes, focus stays inside. */
const FOCUSABLE = 'a[href], button:not([disabled])';
const DESKTOP = '(min-width: 64rem)';

export function initMenus(signal?: AbortSignal): void {
  const mobileOpen = document.querySelector<HTMLButtonElement>('[data-mobile-open]');
  const mobilePanel = document.querySelector<HTMLElement>('[data-mobile-panel]');
  if (!mobileOpen || !mobilePanel) return;
  const desktop = window.matchMedia(DESKTOP);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  let closeTimer = 0;
  const setMobile = (open: boolean, restoreFocus = true) => {
    if (open === (mobileOpen.getAttribute('aria-expanded') === 'true')) return;
    window.clearTimeout(closeTimer);
    mobileOpen.setAttribute('aria-expanded', String(open));
    const label = open ? mobileOpen.dataset.labelClose : mobileOpen.dataset.labelOpen;
    if (label) mobileOpen.setAttribute('aria-label', label);
    document.documentElement.toggleAttribute('data-menu-open', open);
    if (open) {
      mobilePanel.inert = false;
      mobilePanel.hidden = false;
      void mobilePanel.offsetWidth;
      mobilePanel.dataset.state = 'open';
      mobilePanel.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true });
    } else {
      if (restoreFocus) mobileOpen.focus({ preventScroll: true });
      mobilePanel.inert = true;
      delete mobilePanel.dataset.state;
      closeTimer = window.setTimeout(
        () => {
          mobilePanel.hidden = true;
        },
        reduceMotion.matches ? 0 : 240,
      );
    }
  };

  mobileOpen.addEventListener('click', () =>
    setMobile(mobileOpen.getAttribute('aria-expanded') !== 'true'),
  );
  mobilePanel.addEventListener('click', (event) => {
    if (event.target === mobilePanel) setMobile(false);
    else if ((event.target as Element).closest('a[href]')) setMobile(false, false);
  });

  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        setMobile(false);
        return;
      }
      if (event.key !== 'Tab' || mobilePanel.inert) return;
      const items = [
        ...Array.from(document.querySelectorAll<HTMLElement>('[data-menu-extra] a[href]')),
        mobileOpen,
        ...Array.from(mobilePanel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
          (el) => el.tabIndex >= 0,
        ),
      ];
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    { signal },
  );

  const closeImmediately = () => {
    window.clearTimeout(closeTimer);
    mobileOpen.setAttribute('aria-expanded', 'false');
    if (mobileOpen.dataset.labelOpen)
      mobileOpen.setAttribute('aria-label', mobileOpen.dataset.labelOpen);
    document.documentElement.removeAttribute('data-menu-open');
    mobilePanel.inert = true;
    delete mobilePanel.dataset.state;
    mobilePanel.hidden = true;
  };

  desktop.addEventListener('change', () => setMobile(false, false), { signal });
  window.addEventListener('pagehide', closeImmediately, { signal });
}
