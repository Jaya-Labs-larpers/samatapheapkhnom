export function initHeaderMotion(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  const hero = document.querySelector<HTMLElement>('[data-home-hero]');
  const finishIntro = () => header.setAttribute('data-skip-intro', '');
  const sync = () =>
    header.toggleAttribute(
      'data-solid',
      !hero || hero.getBoundingClientRect().bottom <= header.offsetHeight,
    );

  header.addEventListener('pointerdown', finishIntro, { once: true });
  header.addEventListener('focusin', finishIntro);
  window.addEventListener('scroll', finishIntro, { once: true, passive: true });
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync, { passive: true });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) finishIntro();
    sync();
  });
  sync();
}
