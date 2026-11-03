/**
 * Names the clicked card's image just before the page is swapped out, so the
 * cross-document view transition morphs it into the detail page's hero, which
 * carries the same name statically.
 *
 * Leaving a detail page drops that static name first: otherwise going from an
 * activity to its programme would morph one unrelated photo into another.
 *
 * Naming every card up front would lift each one out of the page-content
 * transition and snapshot images nobody clicked. Names are cleared first
 * because a page restored from the back/forward cache still carries the last
 * one, and two elements sharing a name cancel the whole transition.
 */
const NAME = 'card-media';

window.addEventListener('pageswap', (event) => {
  for (const named of document.querySelectorAll<HTMLElement>('.card-media')) {
    named.style.viewTransitionName = '';
  }

  for (const hero of document.querySelectorAll<HTMLElement>('[data-morph-hero]')) {
    hero.style.viewTransitionName = 'none';
  }

  const target = event.activation?.entry?.url;
  if (!event.viewTransition || !target) return;

  const path = new URL(target).pathname;
  const link = Array.from(
    document.querySelectorAll<HTMLAnchorElement>(':is(.card, .program-row) a[href]'),
  ).find((anchor) => new URL(anchor.href).pathname === path);
  const media = link?.closest('.card, .program-row')?.querySelector<HTMLElement>('.card-media');
  if (media) media.style.viewTransitionName = NAME;
});
