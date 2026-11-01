const TARGETS = 'h2, h3, p, figure, blockquote, li, article, dl, table, .btn, .blur-up';
const SKIP = 'form, dialog, details, nav, .partner-marquee, [data-no-reveal]';
const STAGGER_MS = 70;
const MAX_STAGGER = 5;

/**
 * Content below the fold rises in once as it scrolls into view.
 *
 * Only elements that start below the fold are hidden, so nothing the visitor
 * can already see ever blinks out, and nothing is hidden at all without script
 * or with reduced motion. Elements reached in the same frame are staggered.
 */
export function revealOnScroll(root: ParentNode | null = document.querySelector('main')): void {
  if (!root || typeof IntersectionObserver !== 'function') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const fold = window.innerHeight;
  const targets: HTMLElement[] = [];
  for (const element of root.querySelectorAll<HTMLElement>(TARGETS)) {
    if (element.closest(SKIP) || element.parentElement?.closest('[data-reveal]')) continue;
    if (!element.offsetParent) continue;
    if (element.getBoundingClientRect().top < fold) continue;
    element.setAttribute('data-reveal', '');
    targets.push(element);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      let index = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        observer.unobserve(element);
        element.style.setProperty(
          '--reveal-delay',
          `${Math.min(index++, MAX_STAGGER) * STAGGER_MS}ms`,
        );
        element.setAttribute('data-shown', '');
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  );

  for (const element of targets) observer.observe(element);
}
