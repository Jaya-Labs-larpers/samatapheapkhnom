import type { Locale } from './i18n/config';
import { pick } from './i18n/utils';
import { stripInlineLinks } from './inline-links';
import type { CmsImage, Seo } from './content/types';

const searchCopy: Partial<Record<string, Pick<Seo, 'title' | 'description'>>> = {
  'page-about': {
    title: {
      en: 'About Samatapheap Khnom Organization in Phnom Penh',
      km: 'អំពីអង្គការសមត្ថភាពខ្ញុំ និងការងារសង្គមកិច្ចនៅភ្នំពេញ',
    },
  },
  'page-impact': {
    title: {
      en: 'Results of Family Support Programs in Phnom Penh',
      km: 'លទ្ធផលនៃកម្មវិធីគាំទ្រកុមារ និងគ្រួសារនៅភ្នំពេញ',
    },
  },
  'page-faq': {
    title: {
      en: 'Common Questions About SKO’s Family Support Programs',
      km: 'សំណួរញឹកញាប់អំពីកម្មវិធីគាំទ្រគ្រួសាររបស់អង្គការសមត្ថភាពខ្ញុំ',
    },
  },
  'page-privacy': {
    title: {
      en: 'Website Privacy, Analytics and Contact Form Data',
      km: 'ឯកជនភាពលើគេហទំព័រ និងព័ត៌មានក្នុងទម្រង់ទំនាក់ទំនង',
    },
    description: {
      en: 'Learn how SKO handles the details you send through its contact form, measures website visits and protects the form against spam.',
      km: 'ស្វែងយល់ពីរបៀបដែលអង្គការសមត្ថភាពខ្ញុំប្រើព័ត៌មានដែលអ្នកផ្ញើតាមទម្រង់ទំនាក់ទំនង ប្រមូលស្ថិតិអ្នកចូលមើលគេហទំព័រ និងការពារទម្រង់ពីសារឥតបានការ។',
    },
  },
  'page-safeguarding': {
    title: { km: 'គោលនយោបាយការពារកុមារ និងរបៀបរាយការណ៍ពីកង្វល់' },
  },
  'program-tfcf1': {
    title: { km: 'កម្មវិធីសកម្មភាពពលរដ្ឋកុមារ៖ ការអប់រំ និងសុខភាពកុមារ' },
  },
  'activity-1': {
    title: { en: 'Introducing SKO’s New Website in English and Khmer' },
  },
};

export interface ResolvedSeo {
  title: string;
  description: string | undefined;
  ogImage: CmsImage | null;
  noindex: boolean;
}

/**
 * Resolve a page's search/social metadata.
 *
 * The CMS `seo` object is an override, not a requirement — staff fill it in
 * when they want a different search-result title from the on-page heading, and
 * leave it blank the rest of the time. This is the one place that precedence
 * is decided, so it cannot drift between page types.
 */
export function resolveSeo(
  seo: Seo | null | undefined,
  lang: Locale,
  fallback: {
    documentId?: string;
    title: string;
    description?: string | null;
    image?: CmsImage | null;
  },
): ResolvedSeo {
  const defaults = fallback.documentId ? searchCopy[fallback.documentId] : undefined;
  const title = ownLanguage(seo?.title, lang) || defaults?.title?.[lang] || fallback.title;
  const description =
    ownLanguage(seo?.description, lang) || defaults?.description?.[lang] || fallback.description || '';

  return {
    title,
    description: description ? truncate(stripInlineLinks(description), 300) : undefined,
    ogImage: seo?.image ?? fallback.image ?? null,
    noindex: seo?.noindex === true,
  };
}

/**
 * The override in the page's own language only. Elsewhere the fallback is the
 * page's own localised heading and intro, so an English override never lands
 * on a Khmer page's title or description.
 */
function ownLanguage(field: Seo['title'], lang: Locale): string {
  const picked = pick(field, lang);
  return picked.isFallback ? '' : (picked.value ?? '');
}

function truncate(value: string, limit: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > limit ? `${clean.slice(0, limit - 1).trimEnd()}…` : clean;
}
