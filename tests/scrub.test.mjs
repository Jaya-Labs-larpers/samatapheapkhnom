import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/scrub.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { scrubProgress } = context.exports;
const parseLine = (...args) => JSON.parse(JSON.stringify(context.exports.parseLine(...args)));

const VIEWPORT = 800;
const box = (top, height = 400) => ({ top, bottom: top + height });
const IN = ['top', 1];
const OUT = ['bottom', 0];

test('progress is 0 until the top edge reaches the bottom of the window', () => {
  assert.equal(scrubProgress(box(VIEWPORT), VIEWPORT, IN, OUT), 0);
  assert.equal(scrubProgress(box(VIEWPORT + 500), VIEWPORT, IN, OUT), 0);
});

test('progress is 1 once the bottom edge has left the top of the window', () => {
  assert.equal(scrubProgress(box(-400), VIEWPORT, IN, OUT), 1);
  assert.equal(scrubProgress(box(-900), VIEWPORT, IN, OUT), 1);
});

test('progress runs linearly between the two lines', () => {
  const travel = VIEWPORT + 400;
  assert.equal(scrubProgress(box(VIEWPORT - travel / 2), VIEWPORT, IN, OUT), 0.5);
  assert.equal(scrubProgress(box(VIEWPORT - travel / 4), VIEWPORT, IN, OUT), 0.25);
});

test('a custom window shifts where progress starts and ends', () => {
  const start = ['top', 0.7];
  const end = ['bottom', 0.7];
  assert.equal(scrubProgress(box(0.7 * VIEWPORT), VIEWPORT, start, end), 0);
  assert.equal(scrubProgress(box(0.7 * VIEWPORT - 400), VIEWPORT, start, end), 1);
});

test('a box with no travel counts as finished', () => {
  assert.equal(scrubProgress({ top: 100, bottom: 100 }, VIEWPORT, ['top', 0], ['top', 0]), 1);
});

test('lines parse from "<edge> <percent>" and fall back otherwise', () => {
  assert.deepEqual(parseLine('top 70%', IN), ['top', 0.7]);
  assert.deepEqual(parseLine(' bottom 0% ', IN), ['bottom', 0]);
  assert.deepEqual(parseLine('middle 50%', IN), IN);
  assert.deepEqual(parseLine('top 70', IN), IN);
  assert.deepEqual(parseLine(undefined, OUT), OUT);
});
