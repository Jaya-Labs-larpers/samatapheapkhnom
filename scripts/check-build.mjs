/**
 * Structural checks across every built page.
 *
 * Cheap, deterministic invariants that a spot-check on two pages would miss —
 * run after `npm run build`. Lighthouse covers depth on a few routes; this
 * covers breadth on all of them.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { deploymentEnvironment, khmerFallbacks, markerFailures } from './readiness.mjs';
import { findEnvLeaks, findSecrets, secretEnvEntries } from './secrets.mjs';

const env = { ...loadEnv('production', process.cwd(), ''), ...process.env };
const production = deploymentEnvironment(env) === 'production';
const localContent = env.PUBLIC_CONTENT_SOURCE === 'fixtures';
const cmsContent =
  (env.PUBLIC_CONTENT_SOURCE?.trim() || (env.PUBLIC_SANITY_PROJECT_ID?.trim() ? 'sanity' : 'fixtures')) ===
  'sanity';
const siteUrl = (env.PUBLIC_SITE_URL || 'http://localhost:4321').replace(/\/+$/, '');

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));

async function* allFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* allFiles(path);
    else yield path;
  }
}

async function* htmlFiles(dir) {
  for await (const path of allFiles(dir)) if (path.endsWith('.html')) yield path;
}

/** Everything a browser could read as text. Binary assets carry no secrets a scan would find. */
const TEXT_FILE = /\.(?:html|js|mjs|css|json|xml|txt|svg|webmanifest|map)$/;

const failures = [];
const warnings = [];
let checked = 0;

function check(condition, page, message) {
  if (!condition) failures.push(`${page}: ${message}`);
}

for await (const file of htmlFiles(DIST)) {
  const page = `/${relative(DIST, file).split(sep).join('/')}`;
  const html = await readFile(file, 'utf8');
  checked += 1;
  // An internal content marker in the HTML is a leak in any environment, so it
  // fails every build. Missing Khmer is a to-do list for staff, not a leak: it
  // is reported on production Sanity builds and does not block the deploy.
  for (const failure of markerFailures(html)) check(false, page, failure);
  if (production && !localContent)
    for (const warning of khmerFallbacks(html, page)) warnings.push(`${page}: ${warning}`);

  const isKhmer = page.startsWith('/km/');
  const is404 = page.includes('404');

  // Locale correctness
  const lang = /<html lang="([a-z-]+)"/.exec(html)?.[1];
  check(
    lang === (isKhmer ? 'km' : 'en'),
    page,
    `<html lang> is "${lang}", expected "${isKhmer ? 'km' : 'en'}"`,
  );

  // Exactly one h1
  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length;
  check(h1Count === 1, page, `${h1Count} <h1> elements, expected exactly 1`);

  // Security policy was injected
  check(
    !html.includes('__CSP_POLICY__'),
    page,
    'CSP placeholder was not replaced — scripts/csp.mjs did not run',
  );
  check(/<meta http-equiv="Content-Security-Policy"/.test(html), page, 'no CSP meta tag');

  // Every inline script is covered by a hash in this page's own policy
  const policy =
    /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1] ?? '';
  const inlineCount = (html.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/g) ?? []).filter(
    (tag) => !/>\s*<\/script>/.test(tag),
  ).length;
  const hashCount = (policy.match(/'sha256-/g) ?? []).length;
  check(
    hashCount >= inlineCount,
    page,
    `${inlineCount} inline script(s) but only ${hashCount} hash(es) in the policy`,
  );

  // Canonical + both hreflang alternates (404s are noindex, so exempt)
  if (!is404) {
    check(/<link rel="canonical"/.test(html), page, 'no canonical link');
    check(/hreflang="en"/.test(html), page, 'missing hreflang="en"');
    check(/hreflang="km"/.test(html), page, 'missing hreflang="km"');
    check(/hreflang="x-default"/.test(html), page, 'missing hreflang="x-default"');
    check(/<meta name="description"/.test(html), page, 'no meta description');
    const ogImage = /<meta property="og:image" content="([^"]*)"/.exec(html)?.[1];
    // The default preview image is served from the site; per-page images come from the Sanity CDN.
    const shareImageOrigins = [`${siteUrl}/`, 'https://cdn.sanity.io/'];
    check(
      shareImageOrigins.some((origin) => ogImage?.startsWith(origin)),
      page,
      `og:image is not an absolute site or Sanity CDN URL: ${ogImage}`,
    );
    check(/<meta name="twitter:card" content="summary_large_image"/.test(html), page, 'no summary_large_image card');
  }

  // Structured data
  check(/"@type":"NGO"/.test(html), page, 'no Organization/NGO structured data');

  // Accessibility basics that are cheap to assert statically
  check(/<a[^>]*href="#main"/.test(html), page, 'no skip link');
  check(/<main[^>]*id="main"/.test(html), page, 'no <main id="main">');

  // No image without an alt attribute
  const imgsWithoutAlt = (html.match(/<img(?![^>]*\salt(?:=|[\s/>]))[^>]*>/g) ?? []).length;
  check(imgsWithoutAlt === 0, page, `${imgsWithoutAlt} <img> without alt`);
}

// Crawler files: llms.txt lists the site for answer engines. A sitemap lastmod
// is the page's last CMS edit, never the build time, or Google stops trusting it;
// a fixtures build has no edit dates and omits it.
const llms = await readFile(join(DIST, 'llms.txt'), 'utf8').catch(() => '');
check(llms.startsWith('# '), '/llms.txt', 'missing or does not start with an H1 line');
check(/^## Programmes$/m.test(llms) && /^## Pages$/m.test(llms), '/llms.txt', 'missing a section');
check(!/\]\(\//.test(llms), '/llms.txt', 'contains a relative link');
const sitemap = await readFile(join(DIST, 'sitemap-0.xml'), 'utf8').catch(() => '');
const sitemapUrls = (sitemap.match(/<url>/g) ?? []).length;
const sitemapLastmods = (sitemap.match(/<lastmod>/g) ?? []).length;
check(sitemapUrls > 0, '/sitemap-0.xml', 'missing or empty');
check(
  sitemapLastmods === (cmsContent ? sitemapUrls : 0),
  '/sitemap-0.xml',
  `${sitemapUrls} <url> entries but ${sitemapLastmods} <lastmod> elements`,
);

// Secrets — every shipped text file, not only HTML. `_astro/*.js` is where a
// leaked `import.meta.env` value would actually land.
const secretEnv = secretEnvEntries(env);
let scanned = 0;
for await (const file of allFiles(DIST)) {
  const asset = `/${relative(DIST, file).split(sep).join('/')}`;

  // Source maps expose original source and, with it, anything inlined at build time.
  check(!asset.endsWith('.map'), asset, 'source map shipped in production output');

  if (!TEXT_FILE.test(asset)) continue;
  const text = await readFile(file, 'utf8');
  scanned += 1;
  for (const { rule, match } of findSecrets(text)) {
    check(false, asset, `contains what looks like a ${rule}: ${match}`);
  }
  for (const key of findEnvLeaks(text, secretEnv)) {
    check(false, asset, `contains the value of ${key}`);
  }
}

console.log(`[check] ${checked} page(s) checked, ${scanned} text file(s) scanned for secrets`);
if (warnings.length > 0) {
  console.warn(`[check] ${warnings.length} warning(s), not blocking:`);
  for (const warning of warnings) console.warn(`  - ${warning}`);
}
if (failures.length > 0) {
  console.error(`[check] ${failures.length} failure(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log('[check] all structural checks passed');
