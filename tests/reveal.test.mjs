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
  const delays = [];
  const context = {
    exports: {},
    window: { innerHeight: 800, matchMedia: () => ({ matches: false }) },
    document: {},
    setTimeout: (work, ms) => {
      timers.push(work);
      delays.push(ms);
      return timers.length;
    },
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
  return { reveal: context.exports, observers, timers, delays };
}

function box(top, { dataset = {}, classes = [], insideReveal = false } = {}) {
  const props = {};
  return {
    top,
    dataset,
    parentElement: { closest: () => (insideReveal ? {} : null) },
    classList: { contains: (name) => classes.includes(name) },
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

test("plays once: a shown box is never set aside again", () => {
  const { reveal, observers } = load();
  const below = box(1200);
  reveal.revealOnEntry({ root: rootOf(below), viewportHeight: 800, reducedMotion: false });
  assert.equal(observers.length, 1, "only the arrival observer");
  observers[0].enter(below);
  assert.equal(below.dataset.reveal, "shown");
  assert.equal(observers[0].watching.size, 0);
});

test("an explicit data-reveal-delay replaces the row stagger", () => {
  const { reveal, observers } = load();
  const first = box(1200, { dataset: { revealDelay: "450" } });
  const second = box(1200);
  reveal.revealOnEntry({ root: rootOf(first, second), viewportHeight: 800, reducedMotion: false });
  observers[0].enter(first, second);
  assert.equal(first.props["--reveal-delay"], "450ms");
  assert.equal(second.props["--reveal-delay"], "90ms");
});

test("a clip reveal holds its transition for the 1500ms unfold", () => {
  const { reveal, observers, delays } = load();
  const media = box(1200, { classes: ["clip-reveal"] });
  reveal.revealOnEntry({ root: rootOf(media), viewportHeight: 800, reducedMotion: false });
  observers[0].enter(media);
  assert.equal(delays.at(-1), 1500 + 50);
});

test("on phones only boxes that opt in are animated", () => {
  const { reveal } = load();
  const plain = box(1200);
  const opted = box(1200, { dataset: { revealMobile: "true" } });
  reveal.revealOnEntry({
    root: rootOf(plain, opted),
    viewportHeight: 800,
    reducedMotion: false,
    phone: true,
  });
  assert.equal(plain.dataset.reveal, undefined);
  assert.equal(opted.dataset.reveal, "pending");
});

test("section headings rise too, unless a revealing box already carries them", () => {
  const { reveal } = load();
  let selector = "";
  const lone = box(1200);
  const carried = box(1200, { insideReveal: true });
  const root = {
    querySelectorAll: (query) => {
      selector = query;
      return [lone, carried];
    },
  };
  reveal.revealOnEntry({ root, viewportHeight: 800, reducedMotion: false });
  assert.match(selector, /main h2/);
  assert.equal(lone.dataset.reveal, "pending");
  assert.equal(carried.dataset.reveal, undefined);
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
