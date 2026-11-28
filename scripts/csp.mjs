import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// fileURLToPath avoids %20 encoding on paths with spaces.
const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PLACEHOLDER = '__CSP_POLICY__';

const BASE_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://cdn.sanity.io https://*.google-analytics.com https://*.googletagmanager.com",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com",
  'frame-src https://challenges.cloudflare.com https://www.googletagmanager.com',
  'upgrade-insecure-requests',
];

const SCRIPT_HOSTS = [
  'https://challenges.cloudflare.com',
  'https://static.cloudflareinsights.com',
  'https://*.googletagmanager.com',
];

// Chrome enforces script-src against inline application/ld+json and speculationrules
// blocks as well as executable scripts; content must match verbatim before hashing.
const INLINE_SCRIPT = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;

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

const hashOf = (body) => `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;

for await (const file of htmlFiles(DIST)) {
  const html = await readFile(file, 'utf8');
  if (!html.includes(PLACEHOLDER)) {
    missing += 1;
    continue;
  }

  const hashes = new Set();
  for (const match of html.matchAll(INLINE_SCRIPT)) {
    const body = match[2];
    if (body === undefined || body === '') continue;
    hashes.add(hashOf(body));
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
