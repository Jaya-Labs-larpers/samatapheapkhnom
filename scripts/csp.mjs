/**
 * Post-build step: generate a per-page Content-Security-Policy.
 *
 * WHY THIS EXISTS
 * ---------------
 * Every page carries structured data in an inline
 * `<script type="application/ld+json">`. Chrome enforces `script-src` against
 * those blocks — verified, not assumed: under a strict policy Chrome logs
 * "Executing inline script violates the following Content Security Policy
 * directive… The action has been blocked."
 *
 * So a strict CSP needs either `'unsafe-inline'` (which defeats most of the
 * point) or a hash per inline block. The hashes differ per page and change
 * whenever staff edit content, so they cannot live in a hand-written global
 * file — and a union of every page's hashes in one global header would be
 * kilobytes sent on every request.
 *
 * This walks the built HTML, hashes each page's own inline scripts, and writes
 * that page's exact policy into its `<meta http-equiv>` tag. Cost per response:
 * nothing. Scales to any number of activity posts.
 *
 * `frame-ancestors` cannot be set via meta, so it stays in `public/_headers`
 * alongside the other security headers.
 */

import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath, not URL.pathname — the latter leaves %20 in paths like
// "C:\Users\WORLDTECH COMPUTER\…".
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PLACEHOLDER = '__CSP_POLICY__';

/** Everything except script-src, which is assembled per page. */
const BASE_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://cdn.sanity.io",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  'frame-src https://challenges.cloudflare.com',
  'upgrade-insecure-requests',
];

const SCRIPT_HOSTS = ['https://challenges.cloudflare.com', 'https://static.cloudflareinsights.com'];

/**
 * Matches inline <script> blocks — those with no src attribute. The captured
 * content must be byte-identical to what the browser hashes, so it is taken
 * verbatim with no trimming or re-encoding.
 */
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

let pages = 0;
let hashCount = 0;
let missing = 0;

for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  if (!html.includes(PLACEHOLDER)) {
    missing += 1;
    continue;
  }

  const hashes = new Set();
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const body = match[1];
    if (body === undefined || body === '') continue;
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }

  const scriptSrc = ["script-src 'self'", ...SCRIPT_HOSTS, ...hashes].join(' ');
  const policy = [...BASE_DIRECTIVES, scriptSrc].join('; ');

  await writeFile(file, html.replaceAll(PLACEHOLDER, policy), 'utf8');
  pages += 1;
  hashCount += hashes.size;
}

console.log(
  `[csp] wrote per-page policies into ${pages} page(s), ${hashCount} inline-script hash(es)` +
    (missing > 0 ? `, ${missing} file(s) had no placeholder` : ''),
);

if (pages === 0) {
  console.error('[csp] no pages were processed — the meta placeholder is missing from BaseLayout');
  process.exit(1);
}
