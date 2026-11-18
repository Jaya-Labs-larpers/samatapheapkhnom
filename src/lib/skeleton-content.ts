import { defaultLocale, type Locale } from './i18n/config';
import { donatePageLive } from '~/config/donation';
import type { Activity, CmsImage, FaqItem, ImpactStat, Program, Story } from './content/types';
import { ui, type UIKey } from './i18n/strings';
import { formatDate, formatNumber, langAttr, localizePath, pick, t } from './i18n/utils';
import { stripInlineLinks } from './inline-links';

/**
 * The old site's string lookup: a Khmer string left empty stays empty, so the
 * page shows its Khmer alternative or leaves the line out instead of English.
 */
export function tStrict(lang: Locale, key: UIKey): string {
  return ui[lang][key] ?? ui[defaultLocale][key] ?? '';
}

export interface SkAction {
  label: string;
  href: string;
  outline?: boolean;
}

export interface SkCardItem {
  title?: string;
  titleLang?: string;
  href?: string;
  linkLabel?: string;
  body?: string | null;
  bodyLang?: string;
  image?: CmsImage | null;
  quote?: string | null;
  quoteLang?: string;
  cite?: string;
  citeRole?: string | null;
  citeRoleLang?: string;
  citeHref?: string | null;
}

export interface SkPostItem {
  title: string;
  titleLang?: string;
  href: string;
  datetime?: string;
  date: string;
  category?: string | null;
  author?: string | null;
  excerpt?: string | null;
  excerptLang?: string;
  image?: CmsImage | null;
}

export interface SkStatItem {
  value: string;
  prefix?: string | null;
  prefixLang?: string;
  suffix?: string | null;
  label?: string | null;
  labelLang?: string;
  context?: string | null;
  contextLang?: string;
}

export interface SkRowItem {
  index?: string;
  title: string;
  titleLang?: string;
  href?: string;
  body?: string | null;
  bodyLang?: string;
}

export interface SkFaqItem {
  id: string;
  question: string;
  questionLang?: string;
  answer: string;
  answerLang?: string;
}

export function donateHref(lang: Locale): string {
  return localizePath(donatePageLive ? '/donate' : '/contact?topic=donate', lang);
}

export function heroActions(lang: Locale): SkAction[] {
  return [
    { label: t(lang, 'donate'), href: donateHref(lang) },
    {
      label: t(lang, 'partnerWithUs'),
      href: localizePath('/contact?topic=partner', lang),
      outline: true,
    },
  ];
}

export function ctaActions(lang: Locale): SkAction[] {
  return [
    { label: t(lang, 'contactUs'), href: localizePath('/contact', lang) },
    {
      label: t(lang, 'partnerWithUs'),
      href: localizePath('/contact?topic=partner', lang),
      outline: true,
    },
  ];
}

export const categoryLabels: Record<string, Record<Locale, string>> = {
  news: { en: 'News', km: 'ព័ត៌មាន' },
  event: { en: 'Event', km: 'ព្រឹត្តិការណ៍' },
  story: { en: 'Story', km: 'រឿងរ៉ាវ' },
  announcement: { en: 'Announcement', km: 'សេចក្តីជូនដំណឹង' },
};

export function postItem(activity: Activity, lang: Locale): SkPostItem {
  const title = pick(activity.title, lang);
  const excerpt = pick(activity.excerpt, lang);
  return {
    title: title.value ?? '',
    titleLang: langAttr(title),
    href: localizePath(`/activities/${activity.slug}`, lang),
    datetime: activity.publishedAt ?? undefined,
    date: formatDate(activity.publishedAt, lang),
    category: activity.category ? (categoryLabels[activity.category]?.[lang] ?? null) : null,
    author: activity.author ?? null,
    excerpt: excerpt.value,
    excerptLang: langAttr(excerpt),
    image: activity.coverImage ?? null,
  };
}

export function statItem(stat: ImpactStat, lang: Locale): SkStatItem {
  const label = pick(stat.label, lang);
  const context = pick(stat.context, lang);
  const prefix = pick(stat.prefix, lang);
  const suffix = pick(stat.suffix, lang);
  return {
    value:
      stat.displayValue ?? (typeof stat.value === 'number' ? formatNumber(stat.value, lang) : ''),
    prefix: prefix.value,
    prefixLang: langAttr(prefix),
    suffix: suffix.value,
    label: label.value,
    labelLang: langAttr(label),
    context: context.value,
    contextLang: langAttr(context),
  };
}

export function programRow(program: Program, index: number, lang: Locale): SkRowItem {
  const title = pick(program.title, lang);
  const summary = pick(program.summary, lang);
  return {
    index: String(index + 1).padStart(2, '0'),
    title: title.value ?? '',
    titleLang: langAttr(title),
    href: localizePath(`/programs/${program.slug}`, lang),
    body: summary.value,
    bodyLang: langAttr(summary),
  };
}

export function programCard(program: Program, lang: Locale, linkLabel: string): SkCardItem {
  const title = pick(program.title, lang);
  const summary = pick(program.summary, lang);
  return {
    title: title.value ?? '',
    titleLang: langAttr(title),
    href: localizePath(`/programs/${program.slug}`, lang),
    linkLabel,
    body: summary.value,
    bodyLang: langAttr(summary),
    image: program.cardImage ?? program.image ?? null,
  };
}

export function storyCard(story: Story, lang: Locale): SkCardItem {
  const quote = pick(story.quote, lang);
  const role = pick(story.personRole, lang);
  return {
    quote: quote.value,
    quoteLang: langAttr(quote),
    cite: story.personName ?? '',
    citeRole: role.value,
    citeRoleLang: langAttr(role),
    citeHref: story.program ? localizePath(`/programs/${story.program.slug}`, lang) : null,
  };
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Anchors come from the English question so /faq/#… is the same in both languages. */
export function faqItems(faqs: FaqItem[] | null | undefined, lang: Locale): SkFaqItem[] {
  const taken = new Set<string>();
  const items: SkFaqItem[] = [];
  for (const faq of faqs ?? []) {
    const base = slugify(pick(faq.question, 'en').value ?? '') || 'question';
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    const question = pick(faq.question, lang);
    const answer = pick(faq.answer, lang);
    if (!question.value || !answer.value) continue;
    items.push({
      id,
      question: question.value,
      questionLang: langAttr(question),
      answer: answer.value,
      answerLang: langAttr(answer),
    });
  }
  return items;
}

export function faqJsonLd(items: SkFaqItem[]): Record<string, unknown> | null {
  if (items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: stripInlineLinks(item.answer) },
    })),
  };
}
