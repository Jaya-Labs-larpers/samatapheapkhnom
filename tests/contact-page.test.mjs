import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const page = await read('src/page-templates/sko/Contact.astro');
const css = await read('src/styles/forms.css');
const strings =
  (await read('src/lib/i18n/strings.ts')) + (await read('src/lib/i18n/strings.redesign.ts'));

test('the footer is on the contact page', () => {
  assert.doesNotMatch(page, /\bnoFooter\b/);
});

test('every kept piece of contact content is still rendered', () => {
  for (const needle of [
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

test('no safeguarding panel, topic cards or picture placeholders', async () => {
  const form = await read('src/components/forms/ContactForm.astro');
  assert.doesNotMatch(page, /safeguarding|media-placeholder/);
  assert.doesNotMatch(form, /TopicCards|safeguarding/);
  assert.doesNotMatch(css, /\.topic-card|\.safeguarding-panel|\.media-placeholder/);
});

test('?topic= still picks the topic the message is filed under', async () => {
  const form = await read('src/components/forms/ContactForm.astro');
  assert.match(form, /<input type="hidden" name="formType" value="general"/);
  assert.match(form, /URLSearchParams\(window\.location\.search\)\.get\('topic'\)/);
});

test('the form asks only: name, email or phone (their pick), country, what we can help with, message', async () => {
  const form = await read('src/components/forms/ContactForm.astro');
  const names = [...form.matchAll(/<(?:input|select|textarea)[^>]*\sname="([\w-]+)"/g)].map(
    (m) => m[1],
  );
  assert.deepEqual(
    [...new Set(names)],
    [
      'formType',
      'name',
      'preferredContact',
      'email',
      'phone',
      'country',
      'helpWith',
      'message',
      'company_website',
    ],
  );
  assert.doesNotMatch(form, /data-topic-fields/);
  assert.match(form, /data-contact-field="email"[\s\S]*data-contact-field="phone"/);
  assert.match(css, /:has\(input\[name='preferredContact'\]\[value='phone'\]:checked\)/);
});

test('only the picked contact field is sent', async () => {
  const form = await read('src/components/forms/ContactForm.astro');
  assert.match(form, /closest\?\.<HTMLElement>\('\[data-contact-field\]'\)/);
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

test('no welcome title or intro; "Contact us" is the page heading', async () => {
  assert.doesNotMatch(page, /contactWelcome/);
  assert.doesNotMatch(strings, /contactWelcome/);
  assert.match(page, /<h1[^>]*>\s*\{tStrict\(lang, 'contactUs'\)\}/);
});

test('full-screen split: dark contact column left, form right, form before details on a phone', () => {
  assert.match(page, /contact-split__title[\s\S]*contact-split__form[\s\S]*contact-split__info/);
  assert.match(css, /\.contact-split \{[\s\S]*?min-height: calc\(100svh - var\(--header-h\)\)/);
  assert.match(css, /grid-template-areas:\s*'title form'\s*'info form'/);
  assert.doesNotMatch(css, /\.contact-layout|\.contact-card/);
});

test('each contact row is labelled with an existing string', () => {
  for (const key of ['contactEmail', 'contactCall', 'contactVisit']) {
    assert.match(page, new RegExp(`tStrict\\(lang, '${key}'\\)`));
  }
});

test('dark column is one flat colour and runs up behind the header logo', async () => {
  const split = css.slice(css.indexOf('.contact-split {'), css.indexOf('.contact-info {'));
  assert.doesNotMatch(split, /gradient/);
  assert.match(split, /margin-top: calc\(var\(--header-h\) \* -1\)/);
  const scroll = await read('src/lib/header-scroll.ts');
  assert.match(scroll, /brandTone/);
});

test('the nav keeps its frosted surface from the first paint over the split', async () => {
  const header = await read('src/components/layout/Header.astro');
  assert.match(page, /contact-split[^"]*" data-nav-solid/);
  assert.match(header, /\[data-nav-solid\]:first-child\)\) \.hdr__nav/);
});

test('header has no "Get involved": it led to the same contact page as "Contact us"', async () => {
  const nav = await read('src/lib/nav.ts');
  const mainNav = nav.slice(
    nav.indexOf('export const mainNav'),
    nav.indexOf('export const mobileNav'),
  );
  assert.doesNotMatch(mainNav, /navGetInvolved/);
});

test('on desktop the logo starts white over the dark column, before the header script runs', async () => {
  const header = await read('src/components/layout/Header.astro');
  assert.match(
    header,
    /@media \(min-width: 56rem\) \{\s*:global\(:root:has\(main > \[data-nav-solid\]:first-child\)\)\s*\.hdr:not\(\[data-brand-tone\]\)/,
  );
});

test('switching pages softly crossfades what differs in the header instead of snapping', async () => {
  const global = await read('src/styles/global.css');
  assert.match(global, /::view-transition-old\(site-header\) \{\s*animation: page-exit/);
  assert.match(global, /::view-transition-new\(site-header\) \{\s*animation: page-enter/);
});

test('"What can we help with?" offers the six agreed choices, each in both languages', async () => {
  const form = await read('src/components/forms/ContactForm.astro');
  const en = await read('src/lib/i18n/strings.ts');
  assert.match(form, /t\(lang, 'contactHelpTitle'\)/);
  assert.doesNotMatch(form + en, /formPartnershipType|partnership(Technical|Referrals|Corporate)/);
  const keys = [
    'helpPartnership',
    'helpFunding',
    'helpVolunteer',
    'helpConcern',
    'helpMedia',
    'helpOther',
  ];
  assert.match(form, new RegExp(keys.map((k) => `'${k}'`).join(',\\s*')));
  const labels = {
    helpPartnership: 'Partnership',
    helpFunding: 'Funding',
    helpVolunteer: 'Volunteer',
    helpConcern: 'Report a concern',
    helpMedia: 'Media',
    helpOther: 'Others',
  };
  for (const [key, label] of Object.entries(labels)) {
    assert.equal(
      en.match(new RegExp(`\\n  ${key}: '([^']+)'`, 'g'))?.length,
      2,
      `${key} in en and km`,
    );
    assert.match(en, new RegExp(`\\n  ${key}: '${label}',`));
  }
});
