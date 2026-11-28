/**
 * The team chart draws itself in when it scrolls into view: trunk, then the bus
 * and drops, then the cards and staff. Only a chart that starts below the fold
 * is set aside; one already in view, or any chart without IntersectionObserver
 * or under reduced motion, is left fully drawn.
 */
export function drawTeamTrees(): void {
  if (
    typeof IntersectionObserver !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }

  const trees = Array.from(document.querySelectorAll<HTMLElement>('[data-team-tree]'));
  const arrival = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        arrival.unobserve(entry.target);
        (entry.target as HTMLElement).dataset.tree = 'drawn';
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
  );

  for (const tree of trees) {
    if (tree.getBoundingClientRect().top <= window.innerHeight) continue;
    tree.dataset.tree = 'pending';
    arrival.observe(tree);
  }
}
