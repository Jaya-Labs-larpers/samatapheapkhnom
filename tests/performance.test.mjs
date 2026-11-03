import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const theme = read('src/styles/theme.css');
const layout = read('src/layouts/BaseLayout.astro');
const headers = read('public/_headers');

const declared = [...theme.matchAll(/\/fonts\/([\w.-]+\.woff2)/g)].map((m) => m[1]);
const shipped = readdirSync(new URL('public/fonts/', root)).filter((n) => n.endsWith('.woff2'));

test('every font file shipped is declared, and every declared font ships', () => {
  assert.deepEqual([...new Set(declared)].sort(), shipped.sort());
});

test('every font the layout preloads is declared in the theme', () => {
  const preloaded = [...layout.matchAll(/'((?:[a-z0-9]+-)+(?:latin|khmer))'/g)].map(
    (m) => `${m[1]}.woff2`,
  );
  assert.ok(preloaded.length >= 3);
  for (const file of preloaded)
    assert.ok(declared.includes(file), `${file} is preloaded but not declared`);
});

test('the layout preloads at most three fonts per page', () => {
  // English: body + display. Khmer: Khmer + body. A third would starve the hero photo.
  const lists = layout.match(/\?\s*\[([^\]]+)\]\s*:\s*\[([^\]]+)\]/);
  assert.ok(lists, 'font preload lists not found');
  for (const list of [lists[1], lists[2]]) assert.ok(list.split(',').length <= 3);
});

test('the header logo files the layout preloads exist', () => {
  for (const href of layout.match(/\/logo\/[\w.-]+\.svg/g) ?? [])
    assert.ok(existsSync(new URL(`public${href}`, root)), href);
});

test('the Logo component links a cached file instead of inlining the SVG', () => {
  const logo = read('src/components/Logo.astro');
  assert.doesNotMatch(logo, /readFileSync|set:html/);
  assert.match(logo, /\/logo\//);
});

test('static files are cached for at least 30 days', () => {
  for (const path of ['/_astro/*', '/fonts/*', '/images/*', '/logo/*', '/icons/*']) {
    const block = headers.split(/\n(?=\S)/).find((b) => b.startsWith(path));
    assert.ok(block, `${path} has no rule`);
    assert.ok(Number(/max-age=(\d+)/.exec(block)?.[1]) >= 2_592_000, path);
  }
});

test('GTM starts after the page has loaded, not in the head', () => {
  assert.match(layout, /addEventListener\('load'/);
  assert.match(layout, /requestIdleCallback/);
});

test('the contact form styles load only with the form', () => {
  assert.match(read('src/components/forms/ContactForm.astro'), /styles\/forms\.css/);
  assert.doesNotMatch(read('src/styles/global.css'), /\.topic-picker|\.form-panel/);
});
