import type { Locale } from './i18n/config';
import type { UIKey } from './i18n/strings';
import { getPage } from './content';
import { splitBody } from './content/sections';
import { pick } from './i18n/utils';

export interface AboutGroup {
  slug: string;
  key: UIKey;
  path: string;
  /** Positions of the body's h2 sections that belong on this page, English body. */
  sections: number[];
  /** The same for the Khmer body, which is shorter and ordered differently. */
  kmSections: number[];
}

export const aboutGroups: AboutGroup[] = [
  { slug: '', key: 'pageAbout', path: '/about', sections: [0, 1, 2, 7], kmSections: [0, 1, 2, 5] },
  {
    slug: 'approach',
    key: 'aboutApproach',
    path: '/about/approach',
    sections: [3, 4, 11, 12],
    kmSections: [3],
  },
  {
    slug: 'partnerships',
    key: 'aboutPartnerships',
    path: '/about/partnerships',
    sections: [5, 6, 8, 10],
    kmSections: [4],
  },
  {
    slug: 'leadership',
    key: 'aboutLeadership',
    path: '/about/leadership',
    sections: [9],
    kmSections: [],
  },
];

export const aboutSubpages = aboutGroups.filter((group) => group.slug);

/**
 * The About pages worth showing in this language, with the sections each one
 * holds. A page that would carry fewer than two sections is folded back into
 * the overview, so a language with a shorter body gets fewer, fuller pages and
 * never a page that is a title and one paragraph.
 */
export async function availableAboutGroups(lang: Locale): Promise<AboutGroup[]> {
  const page = await getPage('about');
  const { sections } = splitBody(pick(page?.body, lang).value);
  const present = (positions: number[]) => positions.filter((position) => sections[position]);

  const resolved = aboutGroups.map((group) => ({
    ...group,
    sections: present(lang === 'km' ? group.kmSections : group.sections),
  }));

  const folded: number[] = [];
  const kept = resolved.filter((group) => {
    if (group.slug === '' || group.slug === 'leadership') return true;
    if (group.sections.length >= 2) return true;
    folded.push(...group.sections);
    return false;
  });
  const overview = kept[0]!;
  overview.sections = [...overview.sections, ...folded].sort((a, b) => a - b);
  return kept;
}
