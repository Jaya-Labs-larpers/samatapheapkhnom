/** Phone menu under the bar: its menu button toggles it, Esc closes, focus stays inside. */
const FOCUSABLE = 'a[href], button:not([disabled])';
const DESKTOP = '(min-width: 75rem)';

export function initDropdowns(): void {
  const desktop = window.matchMedia(DESKTOP);
  let active: HTMLElement | null = null;
  let dismiss: (() => void) | undefined;
  let closeTimer = 0;
  let pinned = false;

  document.querySelectorAll<HTMLElement>('[data-nav-item]').forEach((item) => {
    const toggle = item.querySelector<HTMLButtonElement>('[data-dd-toggle]');
    const panel = item.querySelector<HTMLElement>('[data-dd]');
    if (!toggle || !panel) return;
    const links = Array.from(item.querySelectorAll<HTMLAnchorElement>('.dd__link'));

    const close = () => {
      window.clearTimeout(closeTimer);
      item.removeAttribute('data-open');
      toggle.setAttribute('aria-expanded', 'false');
      panel.inert = true;
      active = null;
      dismiss = undefined;
      pinned = false;
    };

    const open = () => {
      if (!desktop.matches) return;
      window.clearTimeout(closeTimer);
      if (active === item) return;
      dismiss?.();
      active = item;
      dismiss = close;
      item.setAttribute('data-open', '');
      toggle.setAttribute('aria-expanded', 'true');
      panel.inert = false;
    };

    item.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'touch') open();
    });
    item.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch' || active !== item || pinned) return;
      closeTimer = window.setTimeout(() => {
        if (!panel.querySelector(':focus-visible')) close();
      }, 300);
    });
    toggle.addEventListener('click', (event) => {
      if (!desktop.matches) return;
      if (active === item && (pinned || event.detail === 0)) {
        close();
      } else {
        open();
        pinned = true;
      }
    });
    item.addEventListener('focusout', (event) => {
      if (active === item && !item.contains(event.relatedTarget as Node | null)) close();
    });
    item.addEventListener('keydown', (event) => {
      if (!desktop.matches) return;
      const at = links.indexOf(document.activeElement as HTMLAnchorElement);
      if (event.key === 'Escape' && active === item) {
        event.preventDefault();
        toggle.focus({ preventScroll: true });
        close();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        open();
        links[Math.min(at + 1, links.length - 1)]?.focus();
      } else if (event.key === 'ArrowUp' && at >= 0) {
        event.preventDefault();
        (at === 0 ? toggle : links[at - 1])?.focus();
      }
    });
    panel.addEventListener('click', (event) => {
      if ((event.target as Element).closest('.dd__link') && active === item) close();
    });
  });

  document.addEventListener('pointerdown', (event) => {
    if (!active?.contains(event.target as Node)) dismiss?.();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !event.defaultPrevented) dismiss?.();
  });
  desktop.addEventListener('change', () => dismiss?.());
  window.addEventListener('pagehide', () => dismiss?.());
}

export function initMenus(): void {
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
          groups.forEach((group) => setGroup(group, false));
        },
        reduceMotion.matches ? 0 : 400,
      );
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

  mobileOpen.addEventListener('click', () =>
    setMobile(mobileOpen.getAttribute('aria-expanded') !== 'true'),
  );
  mobilePanel.addEventListener('click', (event) => {
    if (event.target === mobilePanel) setMobile(false);
    else if ((event.target as Element).closest('a[href]')) setMobile(false, false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMobile(false);
      return;
    }
    if (event.key !== 'Tab' || mobilePanel.inert) return;
    const items = [
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
  });

  desktop.addEventListener('change', () => setMobile(false, false));
  window.addEventListener('pagehide', () => setMobile(false, false));
}
