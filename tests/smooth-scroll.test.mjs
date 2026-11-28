import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/smooth-scroll.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function wanted({ flag, reduced, desktop = true, touchOnly = false }) {
  const context = {
    exports: {},
    document: { documentElement: { dataset: flag ? { smoothScroll: flag } : {} } },
    window: {
      matchMedia: (query) => ({
        matches: query.includes('reduce')
          ? reduced
          : query.includes('pointer')
            ? touchOnly
            : desktop,
      }),
    },
  };
  vm.runInNewContext(compiled, context);
  return context.exports.smoothScrollWanted();
}

test('smooth scrolling runs only when the page asks for it and motion is allowed', () => {
  assert.equal(wanted({ flag: 'on', reduced: false }), true);
});

test('a visitor who prefers reduced motion keeps native scrolling', () => {
  assert.equal(wanted({ flag: 'on', reduced: true }), false);
});

test('off below 62rem, as on easehealth.com', () => {
  assert.equal(wanted({ flag: 'on', reduced: false, desktop: false }), false);
});

test('off on touch-only devices, whose native scrolling is already smooth', () => {
  assert.equal(wanted({ flag: 'on', reduced: false, touchOnly: true }), false);
});

test('the PUBLIC_SMOOTH_SCROLL switch turns it off', () => {
  assert.equal(wanted({ flag: undefined, reduced: false }), false);
});

test('Lenis is loaded on demand, not bundled into the first script', () => {
  assert.match(source, /await import\('lenis'\)/);
  assert.doesNotMatch(source, /^import Lenis/m);
});
