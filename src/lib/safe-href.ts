export interface SafeHrefOptions {
  mailto?: boolean;
  tel?: boolean;
}

/**
 * The link target if it is one the site is willing to render, otherwise null.
 * CMS content reaches the page through the public dataset, not only through
 * Studio's validation, so `javascript:` and `data:` must be refused here too.
 * Backslashes are refused because browsers read `/\host` as `//host`.
 */
export function safeHref(
  raw: string | null | undefined,
  options: SafeHrefOptions = {},
): string | null {
  if (typeof raw !== 'string') return null;
  const href = raw.trim();
  // eslint-disable-next-line no-control-regex
  if (!href || /[\u0000-\u001F\u007F\\]/.test(href) || href.startsWith('//')) return null;
  if (href.startsWith('/') || href.startsWith('#')) return href;

  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1]?.toLowerCase();
  if (scheme === 'https' || scheme === 'http') {
    try {
      new URL(href);
      return href;
    } catch {
      return null;
    }
  }
  if (scheme === 'mailto' && options.mailto) return href;
  if (scheme === 'tel' && options.tel) return href;
  return null;
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
