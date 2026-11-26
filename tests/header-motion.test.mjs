import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/lib/header-motion.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

function fakeHeader() {
  const attrs = new Map();
  const listeners = {};
  return {
    attrs,
    listeners,
    offsetHeight: 90,
    addEventListener: (type, fn) => (listeners[type] = fn),
    setAttribute: (name, value) => attrs.set(name, value),
    toggleAttribute: (name, on) => (on ? attrs.set(name, '') : attrs.delete(name)),
  };
}

function load({ y = 0, heroHeight = 800 } = {}) {
  const header = fakeHeader();
  const listeners = {};
  const context = {
    exports: {},
    window: {
      scrollY: y,
      addEventListener: (type, fn, options) => {
        (listeners[type] ??= new Map()).set(fn, options);
      },
    },
    document: {
      querySelector: (selector) => {
        if (selector === '[data-header]') return header;
        if (selector !== '[data-home-hero]' || !heroHeight) return null;
        return {
          getBoundingClientRect: () => ({ bottom: heroHeight - context.window.scrollY }),
        };
      },
    },
  };
  vm.runInNewContext(compiled, context);

  const fire = (type, event) => {
    listeners[type]?.forEach((options, fn) => {
      fn(event);
      if (options?.once) listeners[type].delete(fn);
    });
  };
  const scrollTo = (y) => {
    context.window.scrollY = y;
    fire('scroll');
  };
  return { motion: context.exports, context, header, fire, scrollTo };
}

test('turns solid only once the bar has passed the home photo', () => {
  const { motion, header, scrollTo } = load();
  motion.initHeaderMotion();
  assert.equal(header.attrs.has('data-solid'), false);
  scrollTo(400);
  assert.equal(header.attrs.has('data-solid'), false);
  scrollTo(709);
  assert.equal(header.attrs.has('data-solid'), false);
  scrollTo(710);
  assert.equal(header.attrs.has('data-solid'), true);
  scrollTo(2000);
  assert.equal(header.attrs.has('data-solid'), true);
  scrollTo(0);
  assert.equal(header.attrs.has('data-solid'), false);
});

test('a page loaded below the photo starts solid', () => {
  const { motion, header } = load({ y: 900 });
  motion.initHeaderMotion();
  assert.equal(header.attrs.has('data-solid'), true);
});

test('a page without the home photo is solid', () => {
  const { motion, header } = load({ heroHeight: 0 });
  motion.initHeaderMotion();
  assert.equal(header.attrs.has('data-solid'), true);
});

test('resizing re-checks where the photo ends', () => {
  const { motion, header, fire, context } = load();
  motion.initHeaderMotion();
  context.window.scrollY = 750;
  fire('resize');
  assert.equal(header.attrs.has('data-solid'), true);
});

test('the intro ends on keyboard focus', () => {
  const { motion, header } = load();
  motion.initHeaderMotion();
  assert.equal(header.attrs.has('data-skip-intro'), false);
  header.listeners.focusin();
  assert.equal(header.attrs.has('data-skip-intro'), true);
});

test('reset on pageshow from the back/forward cache', () => {
  const { motion, header, fire } = load();
  motion.initHeaderMotion();
  fire('pageshow', { persisted: true });
  assert.equal(header.attrs.has('data-skip-intro'), true);
});
