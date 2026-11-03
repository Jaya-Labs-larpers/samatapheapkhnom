import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../src/lib/reveal.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

/** Just enough DOM: boxes with a top edge, and an observer we can fire. */
function load({ observer = true } = {}) {
  const observers = [];
  const timers = [];
  const context = {
    exports: {},
    window: { innerHeight: 800, matchMedia: () => ({ matches: false }) },
    document: {},
    setTimeout: (work) => timers.push(work),
    clearTimeout: (id) => id && (timers[id - 1] = () => {}),
    IntersectionObserver: observer
      ? class {
          constructor(callback) {
            this.callback = callback;
            this.watching = new Set();
            observers.push(this);
          }
          observe(box) {
            this.watching.add(box);
          }
          unobserve(box) {
            this.watching.delete(box);
          }
          enter(...boxes) {
            this.callback(
              boxes.map((target) => ({ target, isIntersecting: true })),
            );
          }
          leave(top, ...boxes) {
            this.callback(
              boxes.map((target) => ({
                target,
                isIntersecting: false,
                boundingClientRect: { top },
                rootBounds: { bottom: 800 },
              })),
            );
          }
        }
      : undefined,
  };
  vm.runInNewContext(compiled, context);
  return { reveal: context.exports, observers, timers };
}

function box(top) {
  const props = {};
  return {
    top,
    dataset: {},
    props,
    style: {
      setProperty: (name, value) => (props[name] = value),
      removeProperty: (name) => delete props[name],
    },
    getBoundingClientRect: () => ({ top }),
  };
}

const rootOf = (...boxes) => ({ querySelectorAll: () => boxes });

test("boxes already on screen, or above it, are never hidden", () => {
  const { reveal } = load();
  const inView = box(300);
  const above = box(-900);
  const below = box(1200);
  reveal.revealOnEntry({
    root: rootOf(inView, above, below),
    viewportHeight: 800,
    reducedMotion: false,
  });
  assert.equal(inView.dataset.reveal, undefined);
  assert.equal(above.dataset.reveal, undefined);
  assert.equal(below.dataset.reveal, "pending");
});

test("a box shows on entry, staggered with its row, then hands its styles back", () => {
  const { reveal, observers, timers } = load();
  const boxes = [box(1200), box(1200), box(1200)];
  reveal.revealOnEntry({
    root: rootOf(...boxes),
    viewportHeight: 800,
    reducedMotion: false,
  });
  observers[0].enter(...boxes);
  assert.deepEqual(
    boxes.map((b) => b.dataset.reveal),
    ["shown", "shown", "shown"],
  );
  assert.deepEqual(
    boxes.map((b) => b.props["--reveal-delay"]),
    ["0ms", "90ms", "180ms"],
  );
  assert.equal(observers[0].watching.size, 0, "a shown box stops waiting to arrive");
  timers.forEach((run) => run());
  assert.ok(boxes.every((b) => b.dataset.reveal === undefined));
});

test("a box that scrolls off the bottom is set aside and reveals again", () => {
  const { reveal, observers } = load();
  const onScreen = box(300);
  reveal.revealOnEntry({
    root: rootOf(onScreen),
    viewportHeight: 800,
    reducedMotion: false,
  });
  const [arrival, departure] = observers;
  assert.equal(onScreen.dataset.reveal, undefined);

  departure.leave(900, onScreen);
  assert.equal(onScreen.dataset.reveal, "pending");
  assert.ok(arrival.watching.has(onScreen));

  arrival.enter(onScreen);
  assert.equal(onScreen.dataset.reveal, "shown");
});

test("a box that scrolls off the top stays as it is", () => {
  const { reveal, observers } = load();
  const onScreen = box(300);
  reveal.revealOnEntry({
    root: rootOf(onScreen),
    viewportHeight: 800,
    reducedMotion: false,
  });
  observers[1].leave(-400, onScreen);
  assert.equal(onScreen.dataset.reveal, undefined);
});

test("reduced motion, or no IntersectionObserver, leaves every box alone", () => {
  const below = box(1200);
  load().reveal.revealOnEntry({
    root: rootOf(below),
    viewportHeight: 800,
    reducedMotion: true,
  });
  assert.equal(below.dataset.reveal, undefined);
  load({ observer: false }).reveal.revealOnEntry({
    root: rootOf(below),
    viewportHeight: 800,
    reducedMotion: false,
  });
  assert.equal(below.dataset.reveal, undefined);
});
