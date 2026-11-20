/**
 * The content layer — the single seam between the site and its content source.
 *
 * Pages and components import only from here. They never touch the Sanity
 * client, never write GROQ, and never know whether the content came from the
 * CMS or from local fixtures.
 */

import { sanityClient } from '../sanity/client';
import { localCmsImage } from '../sanity/image';
import * as q from '../sanity/queries';
import * as fixtures from './fixtures';
import { isProductionDeployment, isLocalContent } from '../config';
import { isEmptyLocaleString, stripPlaceholders } from './placeholders';
import { siteSettingsFailures } from '../../../scripts/readiness.mjs';
import type {
  Activity,
  DirectorMessage,
  ImpactStat,
  LocaleString,
  OrgChart,
  Page,
  Partner,
  Program,
  Report,
  SiteSettings,
  Story,
  TeamMember,
} from './types';

const queryCache = new Map<string, { result: Promise<unknown>; expires: number }>();

function readPublished<T>(query: string, params: Record<string, unknown>): Promise<T> {
  const now = Date.now();
  for (const [key, entry] of queryCache) {
    if (entry.expires <= now) queryCache.delete(key);
  }
  const key = JSON.stringify([query, params]);
  const cached = queryCache.get(key);
  if (cached) return cached.result as Promise<T>;

  const result = sanityClient!.fetch<T>(query, params).catch((error: unknown) => {
    if (queryCache.get(key)?.result === result) queryCache.delete(key);
    throw error;
  });
  queryCache.set(key, { result, expires: now + 15_000 });
  return result;
}

/**
 * Every read passes through `stripPlaceholders`, so an unfinished marker cannot
 * reach a page whichever source it came from — a local fixture or a draft a
 * staff member typed into Sanity. See ./placeholders.ts.
 */
async function fetchOr<T>(query: string, params: Record<string, unknown>, fallback: T): Promise<T> {
  if (!sanityClient) {
    if (isProductionDeployment && !isLocalContent)
      throw new Error('[readiness] Sanity is required in production');
    return stripPlaceholders(fallback);
  }
  try {
    const result = await readPublished<T>(query, params);
    if (isProductionDeployment && result == null) {
      throw new Error('[readiness] Required published CMS document is missing');
    }
    return stripPlaceholders((result ?? fallback) as T);
  } catch (error) {
    // Fail the build loudly. A silently empty section discovered in production
    // is far worse than a build that stops here.
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[sko] GROQ query failed — ${message}\nQuery: ${query.slice(0, 120)}…`);
  }
}

/**
 * A document whose headline was nothing but a marker has no publishable form —
 * it is example scaffolding, so it leaves the listings and loses its route
 * rather than appearing as an untitled card.
 */
const titled = (value?: LocaleString | null) => !isEmptyLocaleString(value);

/* --- Singletons ------------------------------------------------------------ */

export async function getSiteSettings(): Promise<SiteSettings> {
  const settings = await fetchOr(q.siteSettingsQuery, {}, fixtures.siteSettings);
  if (isProductionDeployment && !isLocalContent) {
    const failures = siteSettingsFailures(settings);
    if (failures.length) throw new Error(`[readiness] ${failures.join('; ')}`);
  }
  return settings;
}

export function getDirectorMessage(): Promise<DirectorMessage> {
  return fetchOr(q.directorMessageQuery, {}, fixtures.directorMessage);
}

export function getOrgChart(): Promise<OrgChart> {
  return fetchOr(q.orgChartQuery, {}, fixtures.orgChart);
}

/* --- Pages ----------------------------------------------------------------- */

export async function getPage(slug: string): Promise<Page | null> {
  const fallback = fixtures.pages.find((page) => page.slug === slug) ?? null;
  return fetchOr(q.pageBySlugQuery, { slug }, fallback);
}

/* --- Programs -------------------------------------------------------------- */

export async function getPrograms(): Promise<Program[]> {
  const programs = await fetchOr(q.programsQuery, {}, fixtures.programs);
  return programs.filter((program) => titled(program.title));
}

export async function getProgram(slug: string): Promise<Program | null> {
  const fallback = fixtures.programs.find((program) => program.slug === slug) ?? null;
  const program = await fetchOr(q.programBySlugQuery, { slug }, fallback);
  return program && titled(program.title) ? program : null;
}

/* --- Activities ------------------------------------------------------------ */

const WEBSITE_LIVE_SLUG = 'welcome-to-the-new-sko-website';

function withLocalCover(activity: Activity): Activity {
  if (activity.slug !== WEBSITE_LIVE_SLUG || activity.coverImage) return activity;
  return {
    ...activity,
    coverImage: localCmsImage('website-live', {
      en: 'The new SKO website home page: a mother and child at home with an SKO caseworker',
    }),
  };
}

export async function getActivities(): Promise<Activity[]> {
  const activities = await fetchOr(q.activitiesQuery, {}, fixtures.activities);
  return activities.filter((activity) => titled(activity.title)).map(withLocalCover);
}

export async function getActivity(slug: string): Promise<Activity | null> {
  const fallback = fixtures.activities.find((activity) => activity.slug === slug) ?? null;
  const activity = await fetchOr(q.activityBySlugQuery, { slug }, fallback);
  return activity && titled(activity.title) ? withLocalCover(activity) : null;
}

export async function getFeaturedActivities(limit = 3): Promise<Activity[]> {
  const all = await getActivities();
  const featured = all.filter((activity) => activity.featured);
  return (featured.length > 0 ? featured : all).slice(0, limit);
}

/* --- Everything else ------------------------------------------------------- */

function withLocalPortrait(story: Story): Story {
  if (story._id !== 'story-1' || (story.photo && !story.useSilhouette)) return story;
  return {
    ...story,
    useSilhouette: false,
    photo: {
      ...localCmsImage('rcmd-cover', {
        en: 'Sok Vanny speaking into a microphone at a community meeting in Phnom Penh',
      }),
      hotspot: { x: 0.55, y: 0.38 },
    },
  };
}

export async function getStories(): Promise<Story[]> {
  const stories = await fetchOr(q.storiesQuery, {}, fixtures.stories);
  return stories.filter((story) => titled(story.quote)).map(withLocalPortrait);
}

export async function getStory(slug: string): Promise<Story | null> {
  const fallback = fixtures.stories.find((story) => (story.slug ?? story._id) === slug) ?? null;
  const story = await fetchOr(q.storyBySlugQuery, { slug }, fallback);
  return story && titled(story.quote) ? withLocalPortrait(story) : null;
}

export async function getPartners(): Promise<Partner[]> {
  const partners = await fetchOr(q.partnersQuery, {}, fixtures.partners);
  return partners.filter((partner) => partner.name?.trim());
}

export async function getReports(): Promise<Report[]> {
  const reports = await fetchOr(q.reportsQuery, {}, fixtures.reports);
  return reports.filter((report) => titled(report.title));
}

export async function getTeam(): Promise<TeamMember[]> {
  const team = await fetchOr(q.teamQuery, {}, fixtures.team);
  return team.filter((member) => titled(member.name));
}

export async function getImpactStats(): Promise<ImpactStat[]> {
  const stats = await fetchOr(q.impactStatsQuery, {}, fixtures.impactStats);
  return stats.filter((stat) => titled(stat.label));
}

export type * from './types';
