import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const cards = await read('src/components/forms/TopicCards.astro');

test('keeps a native select named by the name prop as the value carrier', () => {
  assert.match(cards, /<select[^>]*(name=\{name\}|\{name\})/);
  assert.match(cards, /topic-cards__native/);
});

test('cards are a labelled radiogroup of radio buttons', () => {
  assert.match(cards, /role="radiogroup"/);
  assert.match(cards, /aria-labelledby=\{labelId\}/);
  assert.match(cards, /role="radio"/);
  assert.match(cards, /aria-checked/);
});

test('honours ?topic= and ignores unknown values', () => {
  assert.match(cards, /URLSearchParams\(window\.location\.search\)\.get\('topic'\)/);
  assert.match(cards, /values\.includes\(requested\)/);
});

test('selecting a card sets the select and fires change', () => {
  assert.match(cards, /dispatchEvent\(new Event\('change', \{ bubbles: true \}\)\)/);
});

test('re-syncs after form reset', () => {
  assert.match(cards, /addEventListener\('reset'/);
});

test('renders only existing copy: topic label and hint', () => {
  assert.match(cards, /t\(lang, topic\.label\)/);
  assert.match(cards, /t\(lang, topic\.hint\)/);
  assert.doesNotMatch(cards, /t\(lang, '/);
});

test('ContactForm uses TopicCards, not TopicPicker', async () => {
  const form = await read('src/components/forms/ContactForm.astro');
  assert.match(form, /import TopicCards from/);
  assert.match(form, /<TopicCards/);
  assert.doesNotMatch(form, /TopicPicker/);
});

test('forms.css has no topic-picker rules and has topic-card rules', async () => {
  const css = await read('src/styles/forms.css');
  assert.doesNotMatch(css, /\.topic-picker/);
  assert.match(css, /\.topic-card\b/);
  assert.match(css, /\.topic-cards__grid/);
});
