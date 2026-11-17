import type { Locale } from '~/lib/i18n/config';
import { homeEn } from './home.en';
import { homeKm } from './home.km';
import type { HomeData } from './home.types';

/** The language's copy, and English to fall back to where Khmer is still missing. */
export function getHomeData(lang: Locale): { data: HomeData; fallback: HomeData } {
  return { data: lang === 'km' ? homeKm : homeEn, fallback: homeEn };
}
