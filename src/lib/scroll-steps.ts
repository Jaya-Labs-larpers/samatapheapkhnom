/**
 * [data-scroll-steps] holds [data-step] sections. The one crossing the middle
 * of the window is the active step: the container gets data-active-step="<n>"
 * and the step data-active, and a "scrollstep" event fires on the container.
 * Every step stays in the page, so nothing depends on this script to be read.
 */
export function initScrollSteps(root: ParentNode = document): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof IntersectionObserver !== 'function') return;

  for (const container of root.querySelectorAll<HTMLElement>('[data-scroll-steps]')) {
    const steps = Array.from(container.querySelectorAll<HTMLElement>('[data-step]'));
    if (steps.length === 0) continue;

    const activate = (step: HTMLElement) => {
      const index = steps.indexOf(step);
      if (container.dataset.activeStep === String(index)) return;
      steps.forEach((other) => other.toggleAttribute('data-active', other === step));
      container.dataset.activeStep = String(index);
      container.dispatchEvent(new CustomEvent('scrollstep', { detail: { index, step } }));
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) activate(entry.target as HTMLElement);
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    steps.forEach((step) => observer.observe(step));
  }
}
