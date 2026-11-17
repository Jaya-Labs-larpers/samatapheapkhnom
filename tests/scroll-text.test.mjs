import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/scroll-text.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {}, Intl };
vm.runInNewContext(compiled, context);
const { revealWindow } = context.exports;
const splitUnits = (...args) => JSON.parse(JSON.stringify(context.exports.splitUnits(...args)));

test('Latin text is split into words of characters, with the spaces kept between', () => {
  const { words, whole } = splitUnits('Hello big world', 'en');
  assert.equal(whole, false);
  assert.deepEqual(words, [
    ['H', 'e', 'l', 'l', 'o'],
    [' '],
    ['b', 'i', 'g'],
    [' '],
    ['w', 'o', 'r', 'l', 'd'],
  ]);
});

test('a character built from combining marks stays one unit', () => {
  const { words } = splitUnits('éa', 'en');
  assert.deepEqual(words, [['é', 'a']]);
});

test('Khmer is split into whole words, never into letters of a cluster', () => {
  const text = 'ការអប់រំគឺជាមូលដ្ឋានគ្រឹះនៃអនាគតរបស់កុមារ';
  const { words, whole } = splitUnits(text, 'km');
  assert.equal(whole, true);
  assert.equal(words.length, 1);
  assert.ok(words[0].length > 1, 'more than one unit');
  assert.equal(words[0].join(''), text);
  for (const unit of words[0]) assert.ok(unit.length > 1 || /\s/.test(unit), unit);
});

test('a locale such as km-KH is treated as Khmer', () => {
  assert.equal(splitUnits('ក', 'km-KH').whole, true);
});

test('the reveal window grows by two per unit after the first', () => {
  assert.equal(revealWindow(1), 10);
  assert.equal(revealWindow(0), 10);
  assert.equal(revealWindow(11), 30);
});
