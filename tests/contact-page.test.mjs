import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const page = await read('src/page-templates/sko/Contact.astro');
const css = await read('src/styles/forms.css');
const strings =
  (await read('src/lib/i18n/strings.ts')) + (await read('src/lib/i18n/strings.redesign.ts'));

test('the footer is back on the contact page', () => {
  assert.doesNotMatch(page, /\bnoFooter\b/);
});

test('every existing piece of contact content is still rendered', () => {
  for (const needle of [
    'formPanelTitleGeneral',
    'safeguardingPanelTitle',
    'contactSafeguardingPolicy',
    'safeguardingContact',
    'safeguardingEmail',
    'settings.email',
    'settings.phone',
    'officeHours',
    'settings.address',
    'settings.mapUrl',
    'viewOnGoogleMaps',
    '<ContactForm',
  ]) {
    assert.ok(page.includes(needle), `${needle} missing from Contact.astro`);
  }
});

test('the safeguarding strip is not tied to a topic', () => {
  assert.match(page, /class="safeguarding-panel\b/);
  assert.doesNotMatch(css, /\.contact-desk\s+\.safeguarding-panel\s*\{\s*display:\s*none/);
  assert.doesNotMatch(css, /\.contact-desk \.form-topic,\s*\.contact-desk \.safeguarding-panel/);
});

test('the Donate link shows only when the donate page is live', () => {
  assert.match(page, /donatePageLive\s*&&/);
  assert.match(page, /donateHref\(lang\)/);
});

test('the page invents no copy: every key it uses already exists', () => {
  const keys = [...page.matchAll(/tStrict\(lang, '(\w+)'\)/g)].map((m) => m[1]);
  assert.ok(keys.length > 0);
  for (const key of keys) {
    assert.match(strings, new RegExp(`\\n  ${key}:`), `${key} is not an existing string`);
  }
});

test('desktop puts the reach card beside the form, mobile stacks it after safeguarding', () => {
  assert.match(css, /grid-template-areas:\s*'title' 'hero' 'form' 'safe' 'info' 'band'/);
  assert.match(css, /'title title' 'hero hero' 'form info' 'safe safe' 'band band'/);
  assert.match(css, /\.contact-layout__info[\s\S]*?position:\s*sticky/);
});

test('two picture placeholders, no existing photo reused', () => {
  assert.equal(page.match(/class="media-placeholder\b/g)?.length, 2);
  assert.match(page, /contact-layout__hero/);
  assert.match(page, /contact-layout__photo/);
  assert.doesNotMatch(page, /images\/|<img|ResponsiveImage/);
});
