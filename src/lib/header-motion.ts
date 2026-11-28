const DARK_HERO_SELECTOR =
  '#main > [data-hero-dark]:first-child, #main > :first-child > [data-hero-dark]:first-child';

function findHero(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>('[data-home-hero]') ??
    document.querySelector<HTMLElement>(DARK_HERO_SELECTOR)
  );
}

export function syncHeaderSolid(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  const hero = findHero();
  header.toggleAttribute(
    'data-solid',
    !hero || hero.getBoundingClientRect().bottom <= header.offsetHeight,
  );
}

export function initHeaderMotion(signal?: AbortSignal): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  const hero = findHero();
  const finishIntro = () => header.setAttribute('data-skip-intro', '');
  const sync = () =>
    header.toggleAttribute(
      'data-solid',
      !hero || hero.getBoundingClientRect().bottom <= header.offsetHeight,
    );

  header.addEventListener('pointerdown', finishIntro, { once: true });
  header.addEventListener('focusin', finishIntro);
  window.addEventListener('scroll', finishIntro, { once: true, passive: true, signal });
  window.addEventListener('scroll', sync, { passive: true, signal });
  window.addEventListener('resize', sync, { passive: true, signal });
  window.addEventListener(
    'pageshow',
    (event) => {
      if (event.persisted) finishIntro();
      sync();
    },
    { signal },
  );
  sync();
}
