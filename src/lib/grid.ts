/**
 * Card grid layout that adapts to the number of items, and the image `sizes`
 * that match it.
 *
 * No card is squeezed below roughly 16rem: four cards only share a row from
 * xl, where each still gets ~265px, and below that they sit two by two rather
 * than three-and-an-orphan. Five fall to three-and-two rather than five
 * slivers.
 *
 * `sizes` has to describe the same layout or the browser fetches for the wrong
 * slot — the old blanket "33vw" pulled ~475px images into 265px cards on a
 * 1440px screen. The rem caps are the card width at the 75rem container.
 *
 * Tailwind only generates classes it can see literally, so every variant is
 * spelled out here rather than built with template strings.
 */
type Layout = 'pairs' | 'thirds' | 'quarters';

const GRID: Record<Layout, string> = {
  pairs: 'grid gap-6 grid-cols-1 sm:grid-cols-2',
  thirds: 'grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  quarters: 'grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4',
};

const SIZES: Record<Layout, string> = {
  pairs: '(min-width: 75rem) 36rem, (min-width: 40rem) 50vw, 100vw',
  thirds: '(min-width: 75rem) 23rem, (min-width: 64rem) 33vw, (min-width: 40rem) 50vw, 100vw',
  quarters: '(min-width: 80rem) 17rem, (min-width: 40rem) 50vw, 100vw',
};

function layoutFor(count: number): Layout {
  const n = Math.max(1, Math.floor(count));
  if (n <= 2) return 'pairs';
  if (n % 4 === 0 && n % 3 !== 0) return 'quarters';
  return 'thirds';
}

export function cardGridCols(count: number): string {
  return GRID[layoutFor(count)];
}

export function cardImageSizes(count: number): string {
  return SIZES[layoutFor(count)];
}
