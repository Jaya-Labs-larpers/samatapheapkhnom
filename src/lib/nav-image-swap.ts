/**
 * The Work drop-down's photo: hovering or focusing a programme crossfades to
 * its picture. Two stacked images swap roles after each fade; requests made
 * mid-fade collapse to the newest, so a fast sweep across the columns never
 * queues a slideshow. Desktop only; the photo loads on first open.
 */

const DESKTOP = '(min-width: 75rem)';
const FADE_MS = 400;
const BUFFER_MS = 20;

export function createSwapQueue(run: (src: string) => Promise<void>): (src: string) => void {
  let shown: string | null = null;
  let running: string | null = null;
  let pending: string | null = null;

  const start = (src: string) => {
    running = src;
    void run(src).then(() => {
      shown = src;
      running = null;
      const next = pending;
      pending = null;
      if (next && next !== shown) start(next);
    });
  };

  return (src: string) => {
    if (running) {
      pending = src === running ? null : src;
      return;
    }
    if (src !== shown) start(src);
  };
}

export function initNavImageSwap(): void {
  const media = document.querySelector<HTMLElement>('[data-swap-media]');
  if (!media) return;
  const [first, second] = Array.from(media.querySelectorAll<HTMLImageElement>('img'));
  const columns = Array.from(document.querySelectorAll<HTMLElement>('[data-swap-src]'));
  const item = media.closest<HTMLElement>('[data-nav-item]');
  if (!first || !second || columns.length === 0 || !item) return;
  const desktop = window.matchMedia(DESKTOP);

  let front = first;
  let back = second;
  const request = createSwapQueue(async (src) => {
    back.src = src;
    await back.decode().catch(() => undefined);
    back.classList.add('is-visible');
    front.classList.remove('is-visible');
    await new Promise((resolve) => setTimeout(resolve, FADE_MS + BUFFER_MS));
    [front, back] = [back, front];
  });

  const show = (column: HTMLElement) => {
    const src = column.dataset.swapSrc;
    if (src && desktop.matches) request(src);
  };
  const firstColumn = columns[0]!;
  item.addEventListener('pointerenter', () => show(firstColumn), { once: true });
  item.addEventListener('focusin', () => show(firstColumn), { once: true });
  columns.forEach((column) => {
    column.addEventListener('pointerenter', () => show(column));
    column.addEventListener('focus', () => show(column));
  });
}
