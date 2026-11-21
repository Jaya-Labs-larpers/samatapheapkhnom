import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const banner = await readFile(
  new URL('../src/components/layout/CookieSettings.astro', import.meta.url),
  'utf8',
);

test('an X in the top right rejects optional cookies and is named for that', () => {
  assert.match(banner, /<button[^>]*class="close"[^>]*data-action="reject"[^>]*aria-label=\{labels\.reject\}/);
  assert.match(banner, /querySelectorAll\('\[data-action="reject"\]'\)/);
});

test('the banner fades out on any choice and fades in when shown, except with reduced motion', () => {
  assert.match(banner, /is-leaving/);
  assert.match(banner, /@starting-style/);
  assert.match(banner, /prefers-reduced-motion/);
});
