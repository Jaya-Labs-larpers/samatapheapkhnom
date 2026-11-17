/** Full-screen phone menu: Esc closes, focus is trapped inside and restored on close. */
const FOCUSABLE = 'a[href], button:not([disabled])';
const DESKTOP = '(min-width: 64rem)';

export function initDropdowns(): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>('[data-nav-item]')).filter(
    (item) => item.querySelector('[data-dd]'),
  );
  const desktop = window.matchMedia(DESKTOP);
  const timers = new WeakMap<HTMLElement, number>();

  const toggleOf = (item: HTMLElement) => item.querySelector<HTMLButtonElement>('[data-dd-toggle]');
  const linksOf = (item: HTMLElement) =>
    Array.from(item.querySelectorAll<HTMLAnchorElement>('.dd__link'));

  const set = (item: HTMLElement, open: boolean) => {
    window.clearTimeout(timers.get(item));
    item.toggleAttribute('data-open', open);
    toggleOf(item)?.setAttribute('aria-expanded', String(open));
    linksOf(item).forEach((link) => (link.tabIndex = open ? 0 : -1));
  };
  const open = (item: HTMLElement) => {
    if (!desktop.matches) return;
    items.forEach((other) => other !== item && set(other, false));
    set(item, true);
  };
  const later = (item: HTMLElement, fn: () => void, ms: number) => {
    window.clearTimeout(timers.get(item));
    timers.set(item, window.setTimeout(fn, ms));
  };

  items.forEach((item) => {
    item.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      later(item, () => open(item), 60);
    });
    item.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      later(item, () => set(item, false), 160);
    });
    toggleOf(item)?.addEventListener('click', () => {
      if (item.hasAttribute('data-open')) set(item, false);
      else open(item);
    });
    item.addEventListener('focusin', (event) => {
      if ((event.target as HTMLElement).matches(':focus-visible')) open(item);
    });
    item.addEventListener('focusout', (event) => {
      const next = event.relatedTarget as Node | null;
      if (!next || !item.contains(next)) set(item, false);
    });
    item.addEventListener('keydown', (event) => {
      if (!item.hasAttribute('data-open')) return;
      const links = linksOf(item);
      const at = links.indexOf(document.activeElement as HTMLAnchorElement);
      if (event.key === 'Escape') {
        set(item, false);
        (toggleOf(item) ?? item.querySelector<HTMLElement>('a'))?.focus();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        links[Math.min(at + 1, links.length - 1)]?.focus();
      } else if (event.key === 'ArrowUp' && at >= 0) {
        event.preventDefault();
        (at === 0 ? toggleOf(item) : links[at - 1])?.focus();
      }
    });
    linksOf(item).forEach((link) => link.addEventListener('click', () => set(item, false)));
  });

  document.addEventListener('pointerdown', (event) => {
    items.forEach((item) => !item.contains(event.target as Node) && set(item, false));
  });
  desktop.addEventListener('change', () => items.forEach((item) => set(item, false)));
}

export function initMenus(): void {
  const mobileOpen = document.querySelector<HTMLButtonElement>('[data-mobile-open]');
  const mobilePanel = document.querySelector<HTMLElement>('[data-mobile-panel]');
  const mobileClose = document.querySelector<HTMLButtonElement>('[data-mobile-close]');
  const desktop = window.matchMedia(DESKTOP);

  let lastFocused: HTMLElement | null = null;

  const setMobile = (open: boolean, restoreFocus = true) => {
    if (!mobilePanel || !mobileOpen) return;
    if (mobilePanel.hidden !== open) return;
    mobilePanel.hidden = !open;
    mobileOpen.setAttribute('aria-expanded', String(open));
    document.documentElement.toggleAttribute('data-menu-open', open);
    if (open) {
      lastFocused = document.activeElement as HTMLElement | null;
      mobileClose?.focus();
    } else if (restoreFocus) {
      (lastFocused ?? mobileOpen).focus();
    }
  };

  mobileOpen?.addEventListener('click', () => setMobile(true));
  mobileClose?.addEventListener('click', () => setMobile(false));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (mobilePanel && !mobilePanel.hidden) setMobile(false);
      return;
    }
    if (event.key !== 'Tab' || !mobilePanel || mobilePanel.hidden) return;
    const items = Array.from(mobilePanel.querySelectorAll<HTMLElement>(FOCUSABLE));
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
  });

  desktop.addEventListener('change', () => setMobile(false, false));
}
