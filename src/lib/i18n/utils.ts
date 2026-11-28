import { defaultLocale, isLocale, type Locale } from './config';
import { ui, type UIKey } from './strings';

/**
 * Build a locale-aware path.
 *   localizePath('/about', 'en') -> '/about/'
 *   localizePath('/about', 'km') -> '/km/about/'
 *   localizePath('/', 'km')      -> '/km/'
 */
export function localizePath(path: string, lang: Locale): string {
  const [pathname = '', query] = path.split('?');
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  const base = trimmed === '' ? '/' : `/${trimmed}/`;
  const search = query ? `?${query}` : '';
  if (lang === defaultLocale) return base + search;
  return (base === '/' ? `/${lang}/` : `/${lang}${base}`) + search;
}

/** Split a pathname into its locale and its locale-free path. */
export function parsePath(pathname: string): { lang: Locale; path: string } {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first !== undefined && isLocale(first) && first !== defaultLocale) {
    return { lang: first, path: `/${segments.slice(1).join('/')}` };
  }
  return { lang: defaultLocale, path: `/${segments.join('/')}` };
}

/**
 * The same page in the other language. The toggle uses this so it never
 * dumps the visitor back on the homepage.
 */
export function alternatePath(pathname: string, target: Locale): string {
  const { path } = parsePath(pathname);
  return localizePath(path, target);
}

/** Translated UI string. Falls back to English if a key is somehow missing. */
export function t(lang: Locale, key: UIKey): string {
  return ui[lang][key] || ui[defaultLocale][key] || '';
}

/**
 * `lang` attribute for text rendered with `t()`: "en" when a Khmer string is
 * still missing and the English one is shown, nothing otherwise.
 */
export function tLang(lang: Locale, key: UIKey): 'en' | undefined {
  return lang !== defaultLocale && !ui[lang][key] ? 'en' : undefined;
}

/* -------------------------------------------------------------------------
   Localised CMS fields
   ------------------------------------------------------------------------- */

export type LocaleField<T> = Partial<Record<Locale, T | null>> | null | undefined;

export interface Picked<T> {
  value: T | null;
  /** The locale the value actually came from. */
  lang: Locale;
  /** True when the requested locale was empty and English was used instead. */
  isFallback: boolean;
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Read a localised field.
 *
 * There is no machine translation anywhere in this site. Staff write both
 * languages. When the Khmer field is empty we render the English text and
 * report it, so the caller can put lang="en" on that element and a screen
 * reader switches voice correctly.
 */
export function pick<T>(field: LocaleField<T>, lang: Locale): Picked<T> {
  const primary = field?.[lang];
  if (!isEmpty(primary)) return { value: primary as T, lang, isFallback: false };

  const fallback = field?.[defaultLocale];
  if (!isEmpty(fallback)) {
    return {
      value: fallback as T,
      lang: defaultLocale,
      isFallback: lang !== defaultLocale,
    };
  }
  return { value: null, lang, isFallback: false };
}

/** Convenience for the common string case. */
export function text(field: LocaleField<string>, lang: Locale): string {
  return pick(field, lang).value ?? '';
}

/** `lang` attribute to stamp on an element, or undefined when none is needed. */
export function langAttr<T>(picked: Picked<T>): string | undefined {
  return picked.isFallback ? picked.lang : undefined;
}

/* -------------------------------------------------------------------------
   Formatting
   ------------------------------------------------------------------------- */

const dateLocale: Record<Locale, string> = { en: 'en-GB', km: 'km-KH' };

export function formatDate(value: string | Date | null | undefined, lang: Locale): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(dateLocale[lang], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Phnom_Penh',
  }).format(date);
}

/** "4 Nov 2026" — the card date. */
export function formatDateShort(value: string | Date | null | undefined, lang: Locale): string {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(dateLocale[lang], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Phnom_Penh',
  }).format(date);
}

export function formatNumber(value: number, lang: Locale): string {
  return new Intl.NumberFormat(dateLocale[lang]).format(value);
}

/** Human file size, printed next to every download so nobody is ambushed on mobile data. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
