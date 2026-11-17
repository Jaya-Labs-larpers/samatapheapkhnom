/**
 * Scroll-snap carousel controls: the previous/next buttons move by one card,
 * and disable themselves when there is nowhere left to go. No autoplay.
 */
export function initCarousels(): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  for (const root of document.querySelectorAll<HTMLElement>('[data-carousel]')) {
    const track = root.querySelector<HTMLElement>('[data-carousel-track]');
    const previous = root.querySelector<HTMLButtonElement>('[data-carousel-prev]');
    const next = root.querySelector<HTMLButtonElement>('[data-carousel-next]');
    if (!track || !previous || !next) continue;

    const step = () => {
      const card = track.firstElementChild as HTMLElement | null;
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    };

    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      previous.disabled = track.scrollLeft <= 1;
      next.disabled = track.scrollLeft >= max - 1;
    };

    const go = (direction: 1 | -1) =>
      track.scrollBy({ left: direction * step(), behavior: reduced.matches ? 'auto' : 'smooth' });

    previous.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(track);
    update();
  }
}
