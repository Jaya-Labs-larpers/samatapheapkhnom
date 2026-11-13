/**
 * Tells IndexNow (Bing, Yandex, Seznam, Naver) which pages changed, so they
 * are recrawled within minutes rather than whenever the crawler next visits.
 * Run by the production Worker's hourly cron (worker/scheduled.ts).
 *
 * The sitemap is the source of truth: each page's <lastmod> is the edit date
 * of its own CMS content (scripts/sitemap-lastmod.mjs), so the pages to submit
 * are the ones whose lastmod is newer than the last submission. Reading the
 * live sitemap, not Sanity, means a page is only submitted once the build
 * carrying its change is actually being served.
 *
 * The key is public by design: IndexNow proves ownership by finding it at
 * keyLocation on the same host. It lives only in public/indexnow-key.txt, and
 * the cron reads it back from the live site, so there is nothing to configure
 * and a submission can never name a key the site is not actually serving.
 */

export const KEY_PATH = '/indexnow-key.txt';

export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/** IndexNow accepts up to 10,000 URLs in one request. */
const MAX_URLS = 10_000;

/**
 * @param {string} xml a sitemap <urlset>
 * @returns {{ loc: string, lastmod: string | null }[]}
 */
export function sitemapEntries(xml) {
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].flatMap(([, entry]) => {
    const loc = /<loc>([^<]+)<\/loc>/.exec(entry)?.[1]?.trim();
    if (!loc) return [];
    const lastmod = /<lastmod>([^<]+)<\/lastmod>/.exec(entry)?.[1]?.trim() ?? null;
    return [{ loc, lastmod }];
  });
}

/**
 * The pages changed since the last submission, and the mark to store once
 * they are accepted. With no earlier submission every page is sent once.
 *
 * @param {object} input
 * @param {{ loc: string, lastmod: string | null }[]} input.entries
 * @param {string | null} input.since newest lastmod already submitted
 * @param {string} input.origin only URLs on this origin are ever submitted
 * @returns {{ urls: string[], mark: string | null }}
 */
export function changedSince({ entries, since, origin }) {
  const sinceMs = since ? Date.parse(since) : Number.NEGATIVE_INFINITY;
  const dated = entries.filter(
    (entry) =>
      entry.loc.startsWith(`${origin}/`) &&
      entry.lastmod &&
      !Number.isNaN(Date.parse(entry.lastmod)),
  );
  const urls = dated
    .filter((entry) => Date.parse(/** @type {string} */ (entry.lastmod)) > sinceMs)
    .map((entry) => entry.loc)
    .slice(0, MAX_URLS);
  const mark =
    dated
      .map((entry) => /** @type {string} */ (entry.lastmod))
      .sort((a, b) => Date.parse(a) - Date.parse(b))
      .at(-1) ?? null;
  return { urls, mark };
}

/**
 * @param {object} input
 * @param {string} input.origin e.g. https://www.samatapheapkhnom.org
 * @param {string} input.key
 * @param {string[]} input.urls
 */
export function indexNowRequest({ origin, key, urls }) {
  return {
    host: new URL(origin).host,
    key,
    keyLocation: `${origin}${KEY_PATH}`,
    urlList: urls,
  };
}

/** 8 to 128 characters of a-z, A-Z, 0-9 and dashes, per the IndexNow protocol. */
export function isValidKey(key) {
  return typeof key === 'string' && /^[A-Za-z0-9-]{8,128}$/.test(key);
}
