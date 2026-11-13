/**
 * The production Worker's cron jobs, which replaced the GitHub Actions
 * schedules (Uptime, Content sync and the nightly Deploy).
 *
 * A failed job throws, so the invocation shows as an error in the Worker's
 * logs, and emails ALERT_TO_EMAIL through Resend when that and the Resend
 * secrets are set.
 */

import { runEdgeChecks } from '../scripts/edge-checks.mjs';
import { syncDecision } from '../scripts/content-sync.mjs';
import {
  INDEXNOW_ENDPOINT,
  KEY_PATH,
  changedSince,
  indexNowRequest,
  isValidKey,
  sitemapEntries,
} from '../scripts/indexnow.mjs';
import type { Env } from './index';

/** Must match `triggers.crons` in wrangler.jsonc. */
export const CRONS = {
  uptime: '15 * * * *',
  contentSync: '45 * * * *',
  nightlyRebuild: '0 19 * * *',
} as const;

/** The publishedAt the content sync last started a build for. */
const TRIGGERED_KEY = 'cron:content-sync:triggered';

/** The newest sitemap lastmod already sent to IndexNow. */
const INDEXNOW_MARK = 'cron:indexnow:submitted';

type Log = (line: string) => void;

async function uptime(env: Env, log: Log): Promise<string | undefined> {
  if (!env.SITE_URL) return 'SITE_URL is not set';
  const results = await runEdgeChecks(env.SITE_URL, { log });
  const failed = results.filter((result) => !result.ok);
  log(`${results.length - failed.length}/${results.length} checks passed against ${env.SITE_URL}`);
  if (failed.length) {
    return `Uptime: ${failed.length} of ${results.length} live checks failed on ${env.SITE_URL}`;
  }
}

async function rebuild(env: Env): Promise<string | undefined> {
  if (!env.DEPLOY_HOOK_URL) return 'DEPLOY_HOOK_URL is not set';
  const response = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
  if (!response.ok) return `the deploy hook returned ${response.status}`;
}

async function newestPublish(env: Env): Promise<string | null> {
  // The live API, not the CDN: the CDN can lag the publish this is looking for.
  const query = `*[!(_type match "sanity.*") && !(_type match "system.*")] | order(_updatedAt desc)[0]._updatedAt`;
  const url =
    `https://${env.SANITY_PROJECT_ID}.api.sanity.io/v${env.SANITY_API_VERSION ?? '2026-01-01'}` +
    `/data/query/${env.SANITY_DATASET ?? 'production'}` +
    `?query=${encodeURIComponent(query)}&perspective=published`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Sanity returned ${response.status}`);
  const { result } = (await response.json()) as { result: string | null };
  return result;
}

async function contentSync(env: Env, log: Log): Promise<string | undefined> {
  if (!env.SANITY_PROJECT_ID) return 'SANITY_PROJECT_ID is not set';
  const publishedAt = await newestPublish(env);
  const triggeredFor = (await env.RATE_LIMIT_KV?.get(TRIGGERED_KEY)) ?? null;
  const { action, reason } = syncDecision({
    publishedAt,
    liveAt: env.CF_VERSION_METADATA?.timestamp,
    triggeredFor,
    now: Date.now(),
  });
  log(`[sync] ${action}: ${reason}`);
  if (action === 'none') return;
  if (action === 'report') return `Content sync: ${reason}`;

  const failed = await rebuild(env);
  if (failed) return `Content sync: ${reason}, and the rebuild did not start: ${failed}`;
  await env.RATE_LIMIT_KV?.put(TRIGGERED_KEY, publishedAt ?? '', {
    expirationTtl: 7 * 24 * 60 * 60,
  });
  return `Content sync started a rebuild: ${reason}`;
}

/**
 * Submits the pages changed since the last run. Unconfigured is not a
 * failure, so the rehearsal and a site without a key stay quiet. A rejected
 * key is reported; a rate limit or an outage is only logged, since the same
 * pages are picked up again on the next run.
 */
async function indexNow(env: Env, log: Log): Promise<string | undefined> {
  if (!env.SITE_URL || !env.RATE_LIMIT_KV) return;
  const origin = new URL(env.SITE_URL).origin;

  const keyFile = await fetch(`${origin}${KEY_PATH}`, { signal: AbortSignal.timeout(10_000) });
  if (!keyFile.ok) return `IndexNow: ${KEY_PATH} returned ${keyFile.status}`;
  const key = (await keyFile.text()).trim();
  if (!isValidKey(key)) return `IndexNow: ${KEY_PATH} does not hold a valid key`;

  const sitemap = await fetch(`${origin}/sitemap-0.xml`, { signal: AbortSignal.timeout(10_000) });
  if (!sitemap.ok) return `IndexNow: the sitemap returned ${sitemap.status}`;
  const since = await env.RATE_LIMIT_KV.get(INDEXNOW_MARK);
  const { urls, mark } = changedSince({
    entries: sitemapEntries(await sitemap.text()),
    since,
    origin,
  });
  if (urls.length === 0 || !mark) {
    log('[indexnow] nothing changed since the last submission');
    return;
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(indexNowRequest({ origin, key, urls })),
  });
  if (response.ok) {
    await env.RATE_LIMIT_KV.put(INDEXNOW_MARK, mark);
    log(`[indexnow] submitted ${urls.length} changed pages`);
    return;
  }
  log(`[indexnow] ${urls.length} pages not accepted: ${response.status}`);
  if (response.status === 403 || response.status === 422) {
    return `IndexNow rejected the key (${response.status}); check ${KEY_PATH} is served`;
  }
}

async function alert(env: Env, problem: string, lines: string[]): Promise<void> {
  if (!env.ALERT_TO_EMAIL || !env.RESEND_API_KEY || !env.MAIL_FROM) return;
  const escape = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(10_000),
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [env.ALERT_TO_EMAIL],
      subject: `[${env.SITE_URL ?? 'site'}] ${problem}`.slice(0, 200),
      html: `<p>${escape(problem)}</p><pre>${escape(lines.join('\n'))}</pre>`,
    }),
  });
  if (!response.ok) throw new Error(`Resend responded ${response.status}`);
}

export async function scheduled(controller: { cron: string }, env: Env): Promise<void> {
  const lines: string[] = [];
  const log: Log = (line) => {
    lines.push(line);
    console.log(line);
  };

  let problem: string | undefined;
  switch (controller.cron) {
    case CRONS.uptime:
      problem = await uptime(env, log);
      break;
    case CRONS.contentSync:
      problem = await contentSync(env, log);
      if (!problem) problem = await indexNow(env, log);
      break;
    case CRONS.nightlyRebuild:
      problem = await rebuild(env);
      break;
    default:
      problem = `no job for cron "${controller.cron}"`;
  }
  if (!problem) return;

  await alert(env, problem, lines).catch((error: unknown) =>
    console.error(`alert email failed: ${error instanceof Error ? error.message : error}`),
  );
  throw new Error(problem);
}
