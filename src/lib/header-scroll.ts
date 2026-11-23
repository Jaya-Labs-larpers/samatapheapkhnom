function isDarkColor(color: string): boolean | null {
  const [r, g, b, a = 1] = color.match(/[\d.]+/g)?.map(Number) ?? [];
  if (r === undefined || g === undefined || b === undefined) return null;
  if (a < 0.5) return null;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}

/**
 * Whether the page content under the given point is dark, skipping the header
 * itself. null when nothing but <html> is hit: during a page transition the
 * snapshot overlay swallows hit-testing, and <html>'s white would read as light.
 */
function contentIsDark(header: HTMLElement, x: number, y: number): boolean | null {
  const below = document.elementsFromPoint(x, y).find((el) => !header.contains(el));
  if (!below || below === document.documentElement) return null;
  for (let el: Element | null = below; el; el = el.parentElement) {
    const dark = isDarkColor(getComputedStyle(el).backgroundColor);
    if (dark !== null) return dark;
  }
  return false;
}

export function initHeaderScroll(): void {
  const header = document.querySelector<HTMLElement>('header.site-header');
  if (!header) return;
  const probe = header.querySelector<HTMLElement>('.hdr__tools') ?? header;
  const brand = header.querySelector<HTMLElement>('.hdr__brand');

  let ticking = false;
  let retries = 0;
  const update = () => {
    ticking = false;
    header.toggleAttribute('data-scrolled', window.scrollY > header.offsetHeight);
    const box = probe.getBoundingClientRect();
    const dark = contentIsDark(header, box.left + box.width / 2, box.top + box.height / 2);
    if (dark === null) {
      if (retries++ < 60) schedule();
      return;
    }
    retries = 0;
    header.dataset.tone = dark ? 'dark' : 'light';
    if (brand) {
      // The logo can sit over a different surface than the actions (a split
      // page with a dark left column), so it reads its own background.
      const logo = brand.getBoundingClientRect();
      const brandDark = contentIsDark(
        header,
        logo.left + logo.width / 2,
        logo.top + logo.height / 2,
      );
      if (brandDark !== null) header.dataset.brandTone = brandDark ? 'dark' : 'light';
    }
  };

  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
}
