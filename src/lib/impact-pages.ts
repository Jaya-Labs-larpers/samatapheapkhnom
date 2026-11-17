import type { Locale } from './i18n/config';
import { getPage } from './content';
import { splitBody } from './content/sections';
import { pick } from './i18n/utils';

export const impactProjectsPath = '/impact/projects';

/** The project-by-project page exists only in a language whose Impact body has sections to put on it. */
export async function impactProjectsAvailable(lang: Locale): Promise<boolean> {
  const page = await getPage('impact');
  return splitBody(pick(page?.body, lang).value).sections.length > 0;
}
