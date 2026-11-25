/** Phone menu under the bar: its menu button toggles it, Esc closes, focus stays inside. */
const FOCUSABLE = 'a[href], button:not([disabled])';
const DESKTOP = '(min-width: 75rem)';

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
      later(item, () => open(item), 0);
    });
    item.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      later(item, () => set(item, false), 300);
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
  const desktop = window.matchMedia(DESKTOP);

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let lastFocused: HTMLElement | null = null;

  let closeTimer = 0;
  const setMobile = (open: boolean, restoreFocus = true) => {
    if (!mobilePanel || !mobileOpen) return;
    if (open === (mobileOpen.getAttribute('aria-expanded') === 'true')) return;
    window.clearTimeout(closeTimer);
    mobileOpen.setAttribute('aria-expanded', String(open));
    const label = open ? mobileOpen.dataset.labelClose : mobileOpen.dataset.labelOpen;
    if (label) mobileOpen.setAttribute('aria-label', label);
    document.documentElement.toggleAttribute('data-menu-open', open);
    if (open) {
      mobilePanel.hidden = false;
      void mobilePanel.offsetWidth;
      mobilePanel.dataset.state = 'open';
      lastFocused = document.activeElement as HTMLElement | null;
    } else {
      delete mobilePanel.dataset.state;
      closeTimer = window.setTimeout(
        () => {
          mobilePanel.hidden = true;
          groups.forEach((group) => setGroup(group, false));
        },
        reduceMotion.matches ? 100 : 400,
      );
      if (restoreFocus && lastFocused !== mobileOpen) (lastFocused ?? mobileOpen).focus();
    }
  };

  const groups = Array.from(document.querySelectorAll<HTMLElement>('[data-mgroup]'));
  const setGroup = (group: HTMLElement, open: boolean) => {
    group.toggleAttribute('data-open', open);
    group.querySelector('[data-mgroup-toggle]')?.setAttribute('aria-expanded', String(open));
    group
      .querySelectorAll<HTMLAnchorElement>('.mmenu__sublink')
      .forEach((link) => (link.tabIndex = open ? 0 : -1));
  };
  groups.forEach((group) => {
    group.querySelector('[data-mgroup-toggle]')?.addEventListener('click', () => {
      const open = !group.hasAttribute('data-open');
      groups.forEach((other) => setGroup(other, other === group && open));
    });
  });

  mobileOpen?.addEventListener('click', () =>
    setMobile(mobileOpen.getAttribute('aria-expanded') !== 'true'),
  );
  mobilePanel?.addEventListener('click', (event) => {
    if (event.target === mobilePanel) setMobile(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (mobilePanel && !mobilePanel.hidden) setMobile(false);
      return;
    }
    if (event.key !== 'Tab' || !mobilePanel || mobilePanel.hidden) return;
    const items = [
      ...(mobileOpen ? [mobileOpen] : []),
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
  });

  desktop.addEventListener('change', () => setMobile(false, false));
}
