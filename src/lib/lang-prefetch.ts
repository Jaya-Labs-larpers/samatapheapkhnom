/**
 * Warm the other language's copy of this page so the toggle is a cache hit.
 *
 * The site is a multi-page app: switching language is a full navigation, and
 * the only way to make it instant without a client router is to have the
 * document, its fonts and its scripts already in the HTTP cache. Hovering or
 * focusing the toggle starts the fetch; a visitor who never touches it pays
 * nothing until the page is idle. Slow connections and data-saver mode are
 * left alone — a prefetch there costs the visitor real money and delays the
 * page they are actually reading.
 */

const warmed = new Set<string>();

function canWarm(): boolean {
  const connection = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  if (connection?.saveData) return false;
  return !connection?.effectiveType || !/^(slow-)?2g$/.test(connection.effectiveType);
}

function warm(url: string): void {
  if (!url || warmed.has(url) || !canWarm()) return;
  warmed.add(url);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  link.as = 'document';
  document.head.append(link);
}

export function initLanguagePrefetch(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('[data-lang-link]'));
  if (links.length === 0) return;

  for (const link of links) {
    const warmLink = () => warm(link.href);
    link.addEventListener('pointerenter', warmLink, { once: true, passive: true });
    link.addEventListener('focus', warmLink, { once: true });
    link.addEventListener('touchstart', warmLink, { once: true, passive: true });
    link.addEventListener('mousedown', warmLink, { once: true });
  }

  const warmAll = () => links.forEach((link) => warm(link.href));
  if (window.requestIdleCallback) window.requestIdleCallback(warmAll, { timeout: 3000 });
  else window.setTimeout(warmAll, 1500);
}
