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
  const animations = [];
  return {
    attrs,
    animations,
    style: { transform: '', willChange: '' },
    offsetHeight: 90,
    getBoundingClientRect: () => ({ height: 90 }),
    setAttribute: (name, value) => attrs.set(name, value),
    removeAttribute: (name) => attrs.delete(name),
    hasAttribute: (name) => attrs.has(name),
    toggleAttribute: (name, on) => (on ? attrs.set(name, '') : attrs.delete(name)),
    animate(keyframes, options) {
      const animation = { keyframes, options, onfinish: null, cancel() {} };
      animations.push(animation);
      return animation;
    },
  };
}

function load({ desktop = true, reduced = false } = {}) {
  const header = fakeHeader();
  const listeners = {};
  const context = {
    exports: {},
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1,
    window: {
      scrollY: 0,
      matchMedia: (query) => ({
        matches: query.includes('reduce') ? reduced : desktop,
        addEventListener() {},
      }),
      addEventListener: (type, fn) => (listeners[type] = fn),
    },
    document: {
      querySelector: (selector) => (selector.includes('site-header') ? header : null),
      documentElement: { hasAttribute: () => false },
    },
  };
  vm.runInNewContext(compiled, context);
  return { motion: context.exports, header, listeners };
}

test('alphaFromLerp is the base lerp at 60fps and clamps long frames', () => {
  const { motion } = load();
  assert.ok(Math.abs(motion.alphaFromLerp(0.1, 16.6667) - 0.1) < 1e-4);
  assert.equal(motion.alphaFromLerp(0.1, 0), 0);
  assert.equal(motion.alphaFromLerp(0.1, 500), motion.alphaFromLerp(0.1, 100));
});

test('hides after passing the bar', () => {
  const { motion } = load();
  assert.equal(motion.nextTarget({ lastY: 100, target: 0 }, 200, 90, false).target, -90);
});

test("does not hide while still within the bar's height", () => {
  const { motion } = load();
  assert.equal(motion.nextTarget({ lastY: 20, target: 0 }, 60, 90, false).target, 0);
});

test('ignores small deltas', () => {
  const { motion } = load();
  const state = { lastY: 200, target: -90 };
  assert.equal(motion.nextTarget(state, 204, 90, false), state);
});

test('always shows near top', () => {
  const { motion } = load();
  assert.equal(motion.nextTarget({ lastY: 300, target: -90 }, 5, 90, false).target, 0);
});

test('shows the bar on upward jumps', () => {
  const { motion } = load();
  assert.equal(motion.nextTarget({ lastY: 900, target: -90 }, 400, 90, false).target, 0);
});

test('keeps the bar shown while a menu is open', () => {
  const { motion } = load();
  assert.equal(motion.nextTarget({ lastY: 100, target: 0 }, 400, 90, true).target, 0);
});

test('desktop intro slides the bar down from above in 1000ms', () => {
  const { motion, header } = load();
  motion.initHeaderMotion();
  assert.equal(header.animations.length, 1);
  const [{ keyframes, options }] = header.animations;
  assert.equal(keyframes[0].transform, 'translate3d(0, -90px, 0)');
  assert.equal(keyframes[1].transform, 'translate3d(0, 0px, 0)');
  assert.equal(options.duration, 1000);
  assert.equal(options.easing, 'cubic-bezier(0, 0, 0, 1)');
  assert.equal(header.attrs.has('data-loaded'), false);
  header.animations[0].onfinish();
  assert.equal(header.attrs.has('data-loaded'), true);
});

test('reduced motion: no intro animation, bar shown at once', () => {
  const { motion, header } = load({ reduced: true });
  motion.initHeaderMotion();
  assert.equal(header.animations.length, 0);
  assert.equal(header.attrs.has('data-loaded'), true);
});

test('phone: no intro animation, bar shown at once', () => {
  const { motion, header } = load({ desktop: false });
  motion.initHeaderMotion();
  assert.equal(header.animations.length, 0);
  assert.equal(header.attrs.has('data-loaded'), true);
});

test('reset on pageshow from the back/forward cache', () => {
  const { motion, header, listeners } = load();
  motion.initHeaderMotion();
  header.style.transform = 'translate3d(0, -90px, 0)';
  header.attrs.set('data-hidden', '');
  listeners.pageshow({ persisted: true });
  assert.equal(header.style.transform, 'translate3d(0, 0px, 0)');
  assert.equal(header.attrs.has('data-loaded'), true);
  assert.equal(header.attrs.has('data-hidden'), false);
});
