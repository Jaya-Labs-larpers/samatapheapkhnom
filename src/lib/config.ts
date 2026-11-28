/**
 * Single seam for environment configuration.
 *
 * No component reads import.meta.env directly — everything flows through here
 * so a missing or malformed value fails once, loudly, at build time rather than
 * silently rendering an empty section in production.
 *
 * Only PUBLIC_* values appear in this file. Server-only secrets (Turnstile
 * secret, Resend key, destination inboxes) are read inside functions/ from the
 * Cloudflare env binding and must never be imported into src/.
 */

const env = import.meta.env;
export const isProductionDeployment = env.PUBLIC_DEPLOYMENT_ENV === 'production';
export const isPreviewDeployment = env.PUBLIC_DEPLOYMENT_ENV === 'preview';
export const contactEnabled =
  env.PUBLIC_CONTACT_ENABLED === 'true' ||
  (!isPreviewDeployment && env.PUBLIC_CONTACT_ENABLED !== 'false');

function str(value: string | undefined): string {
  return (value ?? '').trim();
}

/* --- Sanity --------------------------------------------------------------- */

export const sanityProjectId = str(env.PUBLIC_SANITY_PROJECT_ID);
export const sanityDataset = str(env.PUBLIC_SANITY_DATASET) || 'production';
export const sanityApiVersion = str(env.PUBLIC_SANITY_API_VERSION) || '2026-01-01';

/**
 * True once a real Sanity project is configured. Until then the content layer
 * serves local fixtures so the site builds, previews and can be reviewed before
 * SKO's Sanity project exists. The build logs which mode it used.
 */
export const contentSource =
  str(env.PUBLIC_CONTENT_SOURCE) || (sanityProjectId ? 'sanity' : 'fixtures');
if (!['sanity', 'fixtures'].includes(contentSource))
  throw new Error('[readiness] Invalid PUBLIC_CONTENT_SOURCE');
if (contentSource === 'sanity' && !sanityProjectId)
  throw new Error('[readiness] Sanity content requires a project ID');
export const isLocalContent = contentSource === 'fixtures';
export const preventIndexing = isPreviewDeployment || isLocalContent;
export const hasSanity = contentSource === 'sanity' && sanityProjectId.length > 0;

/* --- Site ----------------------------------------------------------------- */

export const siteUrl = (str(env.PUBLIC_SITE_URL) || 'http://localhost:4321').replace(/\/+$/, '');

/* --- Third party ---------------------------------------------------------- */

export const turnstileSiteKey = str(env.PUBLIC_TURNSTILE_SITE_KEY);
export const cfAnalyticsToken = str(env.PUBLIC_CF_ANALYTICS_TOKEN);

/* --- Build-time reporting -------------------------------------------------- */

export function reportConfig(): void {
  const mode = hasSanity ? `Sanity project ${sanityProjectId}/${sanityDataset}` : 'LOCAL FIXTURES';
  const notes: string[] = [];
  if (!hasSanity)
    notes.push('PUBLIC_SANITY_PROJECT_ID is not set — using src/lib/content/fixtures.ts');
  if (!turnstileSiteKey)
    notes.push('PUBLIC_TURNSTILE_SITE_KEY is not set — forms render without the widget');
  if (!cfAnalyticsToken)
    notes.push('PUBLIC_CF_ANALYTICS_TOKEN is not set — analytics beacon omitted');

  // eslint-disable-next-line no-console
  console.log(`\n[sko] content source: ${mode}`);
  // eslint-disable-next-line no-console
  for (const note of notes) console.log(`[sko] note: ${note}`);
}
