import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const page = await read('src/page-templates/sko/Impact.astro');
const css = await read('src/styles/pages.css');

test('all impact stats render in one unified list without the old mapbox or stat-bar split', () => {
  assert.doesNotMatch(page, /pg-mapbox|pg-stat-bar|pg-stat-grid|pg-stat-card|mapIds/);
  assert.doesNotMatch(css, /\.pg-mapbox|\.pg-stat-bar|\.pg-stat-grid|\.pg-stat-card/);
  assert.match(page, /pg-results__content[\s\S]*pg-results__grid[\s\S]*pg-results__map/);
});

test('the Cambodia map sits outside any box on the right of the 2x2 stats grid', () => {
  assert.match(
    page,
    /<img src="\/maps\/cambodia-phnom-penh\.svg" alt="" width="1000" height="896"/,
  );
  const block = css.slice(
    css.indexOf('.pg-section--results .pg-wrap {'),
    css.indexOf('.pg-prose {'),
  );
  assert.doesNotMatch(block, /box-shadow|border-radius/);
  assert.match(block, /font-size:\s*calc\(var\(--text-h2\)\s*\*\s*1\.6\)/);
  assert.match(block, /grid-template-columns:\s*minmax\(0,\s*1\.12fr\)\s+minmax\(0,\s*0\.88fr\)/);
  assert.match(block, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
});

test('results section stays static at full size with no scroll-zoom animation', () => {
  assert.doesNotMatch(page, /pg-results-track|pg-results-stage|data-scrub/);
  const block = css.slice(
    css.indexOf('.pg-section--results .pg-wrap {'),
    css.indexOf('.pg-prose {'),
  );
  assert.doesNotMatch(block, /view-timeline|pg-results-.*-zoom|min-block-size:\s*260dvh/);
});

test('numeric impact stats animate once per load', () => {
  assert.match(page, /countsUp\(stat\)/);
  assert.match(page, /data-count-to=\{stat\.countTo\} data-count-once/);
  assert.match(page, /countUpOnEntry\(\)/);
});
