import type { Locale } from './i18n/config';
import type { Activity } from './content/types';
import { formatDate, langAttr, localizePath, pick } from './i18n/utils';

export type EventCategory = 'event' | 'announcement';

export interface SkEventRow {
  href: string;
  title: string;
  titleLang?: string;
  datetime?: string;
  day: string;
  month: string;
  date: string;
  category: EventCategory;
}

const order: EventCategory[] = ['event', 'announcement'];
const dateLocale: Record<Locale, string> = { en: 'en-GB', km: 'km-KH' };

const part = (date: Date, lang: Locale, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(dateLocale[lang], { ...options, timeZone: 'Asia/Phnom_Penh' }).format(
    date,
  );

const time = (activity: Activity) => {
  const value = Date.parse(activity.publishedAt ?? '');
  return Number.isNaN(value) ? -Infinity : value;
};

export function eventRows(activities: Activity[], lang: Locale): SkEventRow[] {
  return activities
    .filter((activity): activity is Activity & { category: EventCategory } =>
      order.includes(activity.category as EventCategory),
    )
    .sort((a, b) => time(b) - time(a))
    .map((activity) => {
      const title = pick(activity.title, lang);
      const published = activity.publishedAt ? new Date(activity.publishedAt) : null;
      return {
        href: localizePath(`/activities/${activity.slug}`, lang),
        title: title.value ?? '',
        titleLang: langAttr(title),
        datetime: activity.publishedAt ?? undefined,
        day: published ? part(published, lang, { day: 'numeric' }) : '',
        month: published ? part(published, lang, { month: 'short' }) : '',
        date: formatDate(activity.publishedAt, lang),
        category: activity.category,
      };
    });
}

export function eventTabs(rows: SkEventRow[]): { category: EventCategory; rows: SkEventRow[] }[] {
  return order
    .map((category) => ({ category, rows: rows.filter((row) => row.category === category) }))
    .filter((tab) => tab.rows.length > 0);
}
