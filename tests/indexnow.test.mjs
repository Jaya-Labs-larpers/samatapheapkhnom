import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  KEY_PATH,
  changedSince,
  indexNowRequest,
  isValidKey,
  sitemapEntries,
} from '../scripts/indexnow.mjs';

const ORIGIN = 'https://www.example.org';
const SAMPLE = 'sample'.repeat(3);
const url = (path, lastmod) =>
  `<url><loc>${ORIGIN}${path}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<xhtml:link rel="alternate" hreflang="km-KH" href="${ORIGIN}/km${path}"/></url>`;
const xml = (...urls) => `<?xml version="1.0"?><urlset>${urls.join('')}</urlset>`;

test('reads each page and its lastmod, not the hreflang alternates', () => {
  const entries = sitemapEntries(xml(url('/', '2026-11-01T00:00:00.000Z'), url('/about/')));
  assert.deepEqual(entries, [
    { loc: `${ORIGIN}/`, lastmod: '2026-11-01T00:00:00.000Z' },
    { loc: `${ORIGIN}/about/`, lastmod: null },
  ]);
});

test('the first run submits every dated page', () => {
  const entries = sitemapEntries(
    xml(url('/', '2026-11-02T00:00:00.000Z'), url('/about/', '2026-11-01T00:00:00.000Z')),
  );
  const { urls, mark } = changedSince({ entries, since: null, origin: ORIGIN });
  assert.equal(urls.length, 2);
  assert.equal(mark, '2026-11-02T00:00:00.000Z');
});

test('later runs submit only pages edited since the mark', () => {
  const entries = sitemapEntries(
    xml(url('/', '2026-11-03T00:00:00.000Z'), url('/about/', '2026-11-01T00:00:00.000Z')),
  );
  const { urls, mark } = changedSince({
    entries,
    since: '2026-11-02T00:00:00.000Z',
    origin: ORIGIN,
  });
  assert.deepEqual(urls, [`${ORIGIN}/`]);
  assert.equal(mark, '2026-11-03T00:00:00.000Z');
});

test('nothing is submitted when nothing changed', () => {
  const entries = sitemapEntries(xml(url('/', '2026-11-01T00:00:00.000Z')));
  const { urls } = changedSince({ entries, since: '2026-11-01T00:00:00.000Z', origin: ORIGIN });
  assert.deepEqual(urls, []);
});

test('a URL on another host is never submitted', () => {
  const entries = [
    { loc: 'https://evil.example/', lastmod: '2026-11-05T00:00:00.000Z' },
    { loc: `${ORIGIN}.evil.example/`, lastmod: '2026-11-05T00:00:00.000Z' },
  ];
  const { urls, mark } = changedSince({ entries, since: null, origin: ORIGIN });
  assert.deepEqual(urls, []);
  assert.equal(mark, null);
});

test('the request names the host and where the key file is', () => {
  assert.deepEqual(indexNowRequest({ origin: ORIGIN, key: SAMPLE, urls: [`${ORIGIN}/`] }), {
    host: 'www.example.org',
    key: SAMPLE,
    keyLocation: `${ORIGIN}${KEY_PATH}`,
    urlList: [`${ORIGIN}/`],
  });
});

test('public/ serves a valid key at the key location', async () => {
  const file = await readFile(new URL(`../public${KEY_PATH}`, import.meta.url), 'utf8');
  assert.ok(isValidKey(file.trim()));
  assert.equal(isValidKey('short'), false);
  assert.equal(isValidKey('has/slash/../traversal'), false);
});
