export type Edge = 'top' | 'bottom';
export type Line = readonly [Edge, number];

interface Box {
  top: number;
  bottom: number;
}

const clamp = (value: number): number => Math.min(1, Math.max(0, value));

export function parseLine(value: string | undefined, fallback: Line): Line {
  const match = /^(top|bottom)\s+(-?\d+(?:\.\d+)?)%$/.exec(value?.trim() ?? '');
  return match ? [match[1] as Edge, Number(match[2]) / 100] : fallback;
}

export function scrubProgress(box: Box, viewport: number, start: Line, end: Line): number {
  const from = box[start[0]] - start[1] * viewport;
  const to = box[end[0]] - end[1] * viewport;
  return from === to ? 1 : clamp(from / (from - to));
}

const START: Line = ['top', 1];
const END: Line = ['bottom', 0];

/**
 * Writes --p (0 to 1) on every [data-scrub] element while it is near the window.
 * data-scrub-start / data-scrub-end take "<edge> <viewport %>", e.g. "top 70%".
 * Mapping progress to a visual belongs in CSS: without this script --p is unset,
 * and the CSS falls back to the finished state.
 */
export function initScrub(root: ParentNode = document, signal?: AbortSignal): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (typeof IntersectionObserver !== 'function') return;

  const lines = new Map<HTMLElement, { start: Line; end: Line }>();
  const near = new Set<HTMLElement>();

  const write = (el: HTMLElement, progress: number) =>
    el.style.setProperty('--p', progress.toFixed(4));

  const update = () => {
    const viewport = window.innerHeight;
    const reads: [HTMLElement, number][] = [];
    for (const el of near) {
      const { start, end } = lines.get(el)!;
      reads.push([el, scrubProgress(el.getBoundingClientRect(), viewport, start, end)]);
    }
    for (const [el, progress] of reads) write(el, progress);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting) near.add(el);
        else {
          near.delete(el);
          const { start, end } = lines.get(el)!;
          write(el, scrubProgress(el.getBoundingClientRect(), window.innerHeight, start, end));
        }
      }
      update();
    },
    { rootMargin: '25% 0px' },
  );

  for (const el of root.querySelectorAll<HTMLElement>('[data-scrub]')) {
    lines.set(el, {
      start: parseLine(el.dataset.scrubStart, START),
      end: parseLine(el.dataset.scrubEnd, END),
    });
    el.setAttribute('data-scrub-ready', '');
    observer.observe(el);
  }
  if (lines.size === 0) return;

  window.addEventListener('scroll', update, { passive: true, signal });
  window.addEventListener('resize', update, { signal });
}
