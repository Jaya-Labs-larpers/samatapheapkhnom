import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/events.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const context = {
  exports: {},
  require: (id) => {
    if (id === './i18n/utils') {
      return {
        formatDate: (value) => String(value ?? ''),
        langAttr: () => undefined,
        localizePath: (path) => path,
        pick: (value) => ({ value: value?.en ?? null }),
      };
    }
    throw new Error(`unexpected import ${id}`);
  },
};
vm.runInNewContext(compiled, context);
const plain = (value) => JSON.parse(JSON.stringify(value));
const { eventRows, eventTabs } = context.exports;

const activity = (slug, category, publishedAt) => ({
  _id: slug,
  slug,
  category,
  publishedAt,
  title: { en: slug },
});

test('only events and announcements become rows', () => {
  const rows = eventRows(
    [activity('a', 'event', '2026-03-01'), activity('b', 'news', '2026-03-02')],
    'en',
  );
  assert.deepEqual(plain(rows.map((row) => row.href)), ['/activities/a']);
});

test('rows run newest first and undated rows last', () => {
  const rows = eventRows(
    [
      activity('old', 'event', '2026-03-01'),
      activity('undated', 'event', null),
      activity('new', 'event', '2026-05-01'),
    ],
    'en',
  );
  assert.deepEqual(plain(rows.map((row) => row.title)), ['new', 'old', 'undated']);
});

test('day and month come from the Phnom Penh calendar date', () => {
  const [row] = eventRows([activity('a', 'event', '2026-03-31T20:00:00Z')], 'en');
  assert.equal(row.day, '1');
  assert.match(row.month, /Apr/);
});

test('no rows means no tabs', () => {
  assert.deepEqual(plain(eventTabs([])), []);
});

test('one tab per category present, events before announcements', () => {
  const rows = eventRows(
    [activity('n', 'announcement', '2026-05-01'), activity('e', 'event', '2026-03-01')],
    'en',
  );
  const tabs = eventTabs(rows);
  assert.deepEqual(plain(tabs.map((tab) => tab.category)), ['event', 'announcement']);
  assert.equal(tabs[0].rows.length, 1);
});
