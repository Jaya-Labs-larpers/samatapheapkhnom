export function initHeaderScroll(): void {
  const header = document.querySelector<HTMLElement>('header.site-header');
  if (!header) return;

  let ticking = false;
  const update = () => {
    ticking = false;
    header.toggleAttribute('data-scrolled', window.scrollY > header.offsetHeight);
  };

  update();
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
}
