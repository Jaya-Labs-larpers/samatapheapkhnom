import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { siteSettingsFailures } from '../scripts/readiness.mjs';

const transpile = (text) =>
  ts.transpileModule(text, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
    },
  }).outputText;

const read = (name) => readFile(new URL(`../src/lib/content/${name}`, import.meta.url), 'utf8');
const compiled = transpile(await read('index.ts'));
const compiledPlaceholders = transpile(await read('placeholders.ts'));

/** The real stripper, not a stub — the point of these tests is that it runs on every read. */
function placeholders() {
  const exports = {};
  vm.runInNewContext(compiledPlaceholders, { exports, require: () => ({}) });
  return exports;
}

function content(production, result, local = false, now = Date.now) {
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    Date: { now },
    require(path) {
      if (path === '../sanity/client')
        return { sanityClient: local ? null : { fetch: typeof result === 'function' ? result : async () => result } };
      if (path === '../sanity/image') return { localCmsImage: (name) => ({ asset: { _ref: name } }) };
      if (path === '../sanity/queries') return { directorMessageQuery: 'directorMessage' };
      if (path === './fixtures') return { directorMessage: { name: { en: 'Fixture director' } } };
      if (path === '../config')
        return { isProductionDeployment: production, isLocalContent: local };
      if (path === './placeholders') return placeholders();
      if (path === '../../../scripts/readiness.mjs') return { siteSettingsFailures };
      throw new Error(`Unexpected import ${path}`);
    },
  });
  return exports;
}

test('missing published singleton cannot silently use fixture content in production', async () => {
  await assert.rejects(
    content(true, null).getDirectorMessage(),
    /Required published CMS document is missing/,
  );
  const preview = await content(false, null).getDirectorMessage();
  assert.equal(preview.name.en, 'Fixture director');
  const published = await content(true, {
    name: { en: 'Approved director', km: 'នាយក' },
  }).getDirectorMessage();
  assert.equal(published.name.en, 'Approved director');
});

test('explicit local content works in production without a CMS client', async () => {
  const result = await content(true, null, true).getDirectorMessage();
  assert.equal(result.name.en, 'Fixture director');
});

test('an unfinished content marker never survives a read, from either source', async () => {
  const { stripPlaceholders, isPlaceholderText } = placeholders();

  // Fixture content — the state the site builds in today.
  const fixture = await content(false, null).getDirectorMessage();
  assert.equal(fixture.name.en, 'Fixture director');

  // CMS content — a staff member can type a marker into Sanity just as easily.
  const drafted = await content(false, {
    name: { en: '[NEEDS SKO] Director name', km: 'នាយក' },
  }).getDirectorMessage();
  assert.equal(drafted.name.en, undefined, 'marked value must not reach the page');
  assert.equal(drafted.name.km, 'នាយក', 'finished copy in the other locale survives');

  // A marked paragraph is dropped whole: stripping the prefix alone would leave
  // the instruction that follows it addressed to staff, in public.
  const body = stripPlaceholders({
    en: [
      { _type: 'block', children: [{ _type: 'span', text: 'Real copy.' }] },
      {
        _type: 'block',
        children: [{ _type: 'span', text: '[NEEDS SKO] Add the roles.' }],
      },
    ],
  });
  assert.equal(body.en.length, 1);
  assert.equal(body.en[0].children[0].text, 'Real copy.');

  assert.ok(isPlaceholderText('[EXAMPLE] Child protection training'));
  assert.ok(isPlaceholderText('[PLACEHOLDER — ORG CHART IMAGE]'));
  assert.ok(!isPlaceholderText('Reg. No. 0000 [Ministry of Interior]'));
});

test('published reads share concurrent requests, expire, and retry a failed refresh', async () => {
  let now = 0;
  let reads = 0;
  const api = content(true, async () => {
    reads++;
    if (reads === 2) throw Error('Temporary failure');
    return { name: { en: String(reads) } };
  }, false, () => now);

  await Promise.all([api.getDirectorMessage(), api.getDirectorMessage()]);
  assert.equal((await api.getDirectorMessage()).name.en, '1');
  now = 15_001;
  await assert.rejects(api.getDirectorMessage(), /Temporary failure/);
  assert.equal((await api.getDirectorMessage()).name.en, '3');
});
