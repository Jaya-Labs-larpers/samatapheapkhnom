/**
 * Performance budgets, checked against the built site.
 *
 * Run after `npm run build`. Each rule is a regression we have already paid to
 * fix once: logos inlined into every page, fonts nobody uses, a second
 * render-blocking stylesheet, an image with no reserved box. Budgets sit a
 * little above today's numbers, so growth is a decision rather than an accident.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));

export const BUDGETS = {
  /** One page's HTML, uncompressed. Inline logos alone used to add 140 KB. */
  htmlBytes: 140_000,
  /** The largest inline <svg> a page may carry (icons are well under this). */
  inlineSvgChars: 6_000,
  /** The site stylesheet, gzipped. */
  cssGzipBytes: 16_000,
  /** Render-blocking stylesheets per page: the site's, plus a page's own. */
  stylesheetsPerPage: 2,
  /** All first-party JavaScript in /_astro, gzipped: butterflies, intro, reveals, count-up. */
  jsGzipBytes: 8_000,
  /** Fonts preloaded per page: more starves the LCP image of bandwidth. */
  fontPreloads: 3,
};

const failures = [];
const check = (condition, where, message) => {
  if (!condition) failures.push(`${where}: ${message}`);
};

async function* allFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* allFiles(path);
    else yield path;
  }
}
const urlOf = (file) => `/${relative(DIST, file).split(sep).join('/')}`;
const exists = (path) =>
  stat(path).then(
    () => true,
    () => false,
  );

// --- Assets ---------------------------------------------------------------
let css = '';
let jsGzip = 0;
for await (const file of allFiles(join(DIST, '_astro'))) {
  const body = await readFile(file);
  if (file.endsWith('.css')) {
    css += body.toString('utf8');
    // The largest single stylesheet is the site's.
    check(
      gzipSync(body).length <= BUDGETS.cssGzipBytes,
      urlOf(file),
      `stylesheet is ${gzipSync(body).length} B gzipped, budget ${BUDGETS.cssGzipBytes} B`,
    );
  }
  if (file.endsWith('.js')) jsGzip += gzipSync(body).length;
}
check(
  jsGzip <= BUDGETS.jsGzipBytes,
  '/_astro',
  `JS is ${jsGzip} B gzipped, budget ${BUDGETS.jsGzipBytes} B`,
);

// Every font file shipped is one a stylesheet declares, and every declared one ships.
const declared = new Set([...css.matchAll(/\/fonts\/([\w.-]+\.woff2)/g)].map((m) => m[1]));
const shipped = (await readdir(join(PUBLIC, 'fonts'))).filter((name) => name.endsWith('.woff2'));
for (const name of shipped)
  check(declared.has(name), `/fonts/${name}`, 'shipped but no @font-face uses it');
for (const name of declared)
  check(shipped.includes(name), `/fonts/${name}`, 'declared but missing');

// Long-lived caching for everything that is not a page.
const headers = await readFile(join(PUBLIC, '_headers'), 'utf8');
for (const path of ['/_astro/*', '/fonts/*', '/images/*', '/logo/*', '/icons/*']) {
  const rule = headers.split(/\n(?=\S)/).find((block) => block.startsWith(path));
  check(
    rule && /max-age=(\d+)/.test(rule) && Number(/max-age=(\d+)/.exec(rule)[1]) >= 2_592_000,
    '_headers',
    `${path} must be cached for at least 30 days`,
  );
}

// --- Pages ----------------------------------------------------------------
let pages = 0;
for await (const file of allFiles(DIST)) {
  if (!file.endsWith('.html')) continue;
  const page = urlOf(file);
  const html = await readFile(file, 'utf8');
  pages += 1;

  check(
    html.length <= BUDGETS.htmlBytes,
    page,
    `HTML is ${html.length} B, budget ${BUDGETS.htmlBytes} B`,
  );

  for (const svg of html.match(/<svg[\s\S]*?<\/svg>/g) ?? [])
    check(
      svg.length <= BUDGETS.inlineSvgChars,
      page,
      `inline SVG of ${svg.length} chars — serve it as a cached file`,
    );

  const sheets = html.match(/<link[^>]+rel="stylesheet"[^>]*>/g) ?? [];
  check(
    sheets.length <= BUDGETS.stylesheetsPerPage,
    page,
    `${sheets.length} render-blocking stylesheets`,
  );
  for (const sheet of sheets)
    check(!/href="https?:/.test(sheet), page, 'stylesheet from another origin');

  // Fonts: only same-origin, only a few, only files that exist.
  const preloads = [...html.matchAll(/<link[^>]+rel="preload"[^>]+as="font"[^>]*>/g)].map(
    (m) => m[0],
  );
  check(
    preloads.length <= BUDGETS.fontPreloads,
    page,
    `${preloads.length} font preloads, budget ${BUDGETS.fontPreloads}`,
  );
  for (const tag of preloads) {
    const href = /href="([^"]+)"/.exec(tag)?.[1] ?? '';
    check(
      href.startsWith('/') && (await exists(join(DIST, href))),
      page,
      `font preload ${href} is not a shipped file`,
    );
  }

  // No <script src> that blocks parsing: external scripts must defer, async, or be modules.
  for (const tag of html.match(/<script[^>]+src="[^"]+"[^>]*>/g) ?? [])
    check(
      /\b(defer|async)\b|type="module"/.test(tag),
      page,
      `blocking script: ${tag.slice(0, 80)}`,
    );

  // Every image reserves its box (no layout shift) and says what it is (or that it is decoration).
  for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
    check(
      /\swidth="\d+"/.test(tag) && /\sheight="\d+"/.test(tag),
      page,
      `<img> with no width/height: ${tag.slice(0, 90)}`,
    );
    check(/\salt(?=[\s=>])/.test(tag), page, `<img> with no alt: ${tag.slice(0, 90)}`);
  }
}

if (failures.length > 0) {
  console.error(`[perf] ${failures.length} budget failure(s) across ${pages} page(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`[perf] ${pages} page(s) within budget`);
