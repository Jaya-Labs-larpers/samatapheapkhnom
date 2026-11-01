import type { APIRoute } from 'astro';
import { getPage, getPrograms, getReports, getSiteSettings } from '~/lib/content';
import type { Page } from '~/lib/content/types';
import { ui } from '~/lib/i18n/strings';
import { text } from '~/lib/i18n/utils';
import { stripInlineLinks } from '~/lib/inline-links';
import { resolveSeo } from '~/lib/seo';
import { donationEnabled } from '~/lib/donation';

const en = ui.en;

type Line = { title: string; path: string; description: string };

function clean(value: string | null | undefined): string {
  return stripInlineLinks(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cmsPageLine(page: Page | null, path: string, fallbackTitle: string): Line | null {
  if (!page) return null;
  const title = clean(text(page.title, 'en')) || fallbackTitle;
  const seo = resolveSeo(page.seo, 'en', { title, description: text(page.intro, 'en') });
  return { title, path, description: seo.description ?? '' };
}

function entry(site: URL, { title, path, description }: Line): string {
  const href = /^https?:\/\//.test(path) ? path : new URL(path, site).href;
  return description ? `- [${title}](${href}): ${description}` : `- [${title}](${href})`;
}

export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('http://localhost:4321');
  const [settings, about, faq, impact, safeguarding, programs, reports] = await Promise.all([
    getSiteSettings(),
    getPage('about'),
    getPage('faq'),
    getPage('impact'),
    getPage('safeguarding'),
    getPrograms(),
    getReports(),
  ]);

  const orgName = clean(text(settings.orgName, 'en')) || 'Samatapheap Khnom Organization';
  const shortName = settings.orgShortName?.trim() || 'SKO';
  const summary = clean(text(about?.intro, 'en')) || clean(en.homeHeroIntro);
  const registration = clean(text(settings.registration, 'en'));

  const programLines = programs.map((program) => {
    const title = clean(text(program.title, 'en'));
    const seo = resolveSeo(program.seo, 'en', {
      title,
      description: text(program.summary, 'en'),
    });
    return { title, path: `/programs/${program.slug}/`, description: seo.description ?? '' };
  });

  const pageLines = [
    { title: orgName, path: '/', description: clean(en.metaHome) },
    cmsPageLine(about, '/about/', en.pageAbout),
    { title: en.pagePrograms, path: '/programs/', description: clean(en.metaPrograms) },
    { title: en.pageActivities, path: '/activities/', description: clean(en.metaActivities) },
    cmsPageLine(impact, '/impact/', en.pageImpact),
    { title: en.pagePartners, path: '/partners/', description: clean(en.metaPartners) },
    {
      title: en.pageContact,
      path: '/contact/',
      description: clean(
        en.metaContact
          .replace('{phone}', settings.phone ?? '')
          .replace('{email}', settings.email ?? ''),
      ),
    },
    donationEnabled
      ? { title: en.pageDonate, path: '/donate/', description: clean(en.donateHeroIntro) }
      : null,
    cmsPageLine(faq, '/faq/', en.pageFaq),
    { title: en.pageReports, path: '/reports/', description: clean(en.metaReports) },
    cmsPageLine(safeguarding, '/safeguarding/', en.pageSafeguarding),
  ].filter((line): line is Line => line !== null);

  const reportLines = reports.map((report) => ({
    title: clean(text(report.title, 'en')),
    path: report.file?.url ?? '/reports/',
    description: clean(text(report.summary, 'en')),
  }));

  const khmerName = clean(text(settings.orgName, 'km'));

  const sections = [
    `# ${orgName} (${shortName})`,
    '',
    `> ${summary}`,
    '',
    ...(registration ? [registration, ''] : []),
    '## Programmes',
    '',
    ...programLines.map((line) => entry(base, line)),
    '',
    '## Pages',
    '',
    ...pageLines.map((line) => entry(base, line)),
    '',
    '## Reports and policies',
    '',
    ...reportLines.map((line) => entry(base, line)),
    '',
    '## Khmer',
    '',
    entry(base, {
      title: khmerName || `${orgName} (Khmer)`,
      path: '/km/',
      description: 'The same site in Khmer; every page above has a /km/ counterpart.',
    }),
    '',
  ];

  return new Response(sections.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
