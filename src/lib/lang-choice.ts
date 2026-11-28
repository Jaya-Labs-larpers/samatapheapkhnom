import { isLocale } from './i18n/config';

export const LANG_COOKIE = 'sko-lang';
const ONE_YEAR_S = 31_536_000;

export function initLanguageMemory(): void {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.addEventListener('click', (event) => {
    const link = (event.target as Element).closest('[data-lang-link]');
    const lang = link?.getAttribute('hreflang') ?? '';
    if (isLocale(lang))
      document.cookie = `${LANG_COOKIE}=${lang}; Max-Age=${ONE_YEAR_S}; path=/; SameSite=Lax${secure}`;
  });
}
