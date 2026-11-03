import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../src/lib/count-up.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;

/**
 * Just enough DOM: figures with text, a clock we advance by hand, animation
 * frames we run one at a time, an observer we can fire, and a page that is
 * already on screen (no `pagereveal`, tab visible).
 */
function load({ observer = true, reducedMotion = false } = {}) {
  const observers = [];
  const clock = { now: 1000 };
  let queued = [];
  let nextId = 1;
  const context = {
    exports: {},
    window: {
      innerHeight: 800,
      matchMedia: () => ({ matches: reducedMotion }),
      addEventListener: () => {},
    },
    document: {
      visibilityState: "visible",
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    setTimeout: (work) => {
      work();
      return 1;
    },
    clearTimeout: () => {},
    performance: { now: () => clock.now },
    requestAnimationFrame: (work) => {
      const id = nextId++;
      queued.push({ id, work });
      return id;
    },
    cancelAnimationFrame: (id) => {
      queued = queued.filter((frame) => frame.id !== id);
    },
    IntersectionObserver: observer
      ? class {
          constructor(callback) {
            this.callback = callback;
            this.watching = new Set();
            observers.push(this);
          }
          observe(figure) {
            this.watching.add(figure);
          }
          enter(ratio, ...figures) {
            this.callback(
              figures.map((target) => ({
                target,
                isIntersecting: ratio > 0,
                intersectionRatio: ratio,
                boundingClientRect: { top: 400 },
                rootBounds: { bottom: 800 },
              })),
            );
          }
          leave(top, ...figures) {
            this.callback(
              figures.map((target) => ({
                target,
                isIntersecting: false,
                intersectionRatio: 0,
                boundingClientRect: { top },
                rootBounds: { bottom: 800 },
              })),
            );
          }
        }
      : undefined,
  };
  vm.runInNewContext(compiled, context);

  /** Advance the clock and run the frames queued before this tick. */
  const tick = (ms) => {
    clock.now += ms;
    const due = queued;
    queued = [];
    for (const frame of due) frame.work(clock.now);
  };
  return {
    countUp: context.exports,
    observers,
    tick,
    pending: () => queued.length,
  };
}

function figure(text, target, { painted = true } = {}) {
  const state = { painted };
  return {
    textContent: text,
    dataset: { countTo: String(target) },
    checkVisibility: () => state.painted,
    paint: () => (state.painted = true),
  };
}

const rootOf = (...figures) => ({ querySelectorAll: () => figures });

/** Let the "page is on screen" promise settle before frames run. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

const roll = (tick, ms, step = 100) => {
  for (let elapsed = 0; elapsed < ms; elapsed += step) tick(step);
};

test("a figure rolls from zero to its template, keeping its unit and grouping", async () => {
  const { countUp, observers, tick } = load();
  const rice = figure("33,910 kg", 33910);
  const share = figure("97%", 97);
  const families = figure("~2000", 2000);
  countUp.countUpOnEntry(rootOf(rice, share, families));
  assert.deepEqual(
    [rice, share, families].map((f) => f.textContent),
    ["0 kg", "0%", "~0"],
  );

  observers[0].enter(0.6, rice, share, families);
  await settle();
  tick(16);
  tick(1000);
  assert.match(rice.textContent, /^\d{1,2},\d{3} kg$/, "grouped while rolling");
  assert.match(share.textContent, /^\d{1,2}%$/);
  assert.match(families.textContent, /^~\d{3,4}$/, "no grouping when the template has none");

  roll(tick, countUp.COUNT_UP_MS);
  assert.deepEqual(
    [rice, share, families].map((f) => f.textContent),
    ["33,910 kg", "97%", "~2000"],
  );
});

test("every figure rolls on the same clock and lands together", async () => {
  const { countUp, observers, tick } = load();
  const small = figure("14", 14);
  const large = figure("33,910 kg", 33910);
  countUp.countUpOnEntry(rootOf(small, large));
  observers[0].enter(0.6, small, large);
  await settle();
  roll(tick, countUp.COUNT_UP_MS / 2);
  assert.notEqual(small.textContent, "14");
  assert.notEqual(large.textContent, "33,910 kg");
  roll(tick, countUp.COUNT_UP_MS / 2 + 100);
  assert.equal(small.textContent, "14");
  assert.equal(large.textContent, "33,910 kg");
});

test("a figure in a box that has not appeared yet holds at zero, then rolls", async () => {
  const { countUp, observers, tick } = load();
  const share = figure("97%", 97, { painted: false });
  countUp.countUpOnEntry(rootOf(share));
  observers[0].enter(0.6, share);
  await settle();
  roll(tick, 600);
  assert.equal(share.textContent, "0%", "held while its box is still invisible");

  share.paint();
  tick(16);
  tick(200);
  assert.notEqual(share.textContent, "0%");
  roll(tick, countUp.COUNT_UP_MS);
  assert.equal(share.textContent, "97%");
});

test("a held figure rolls anyway once the wait runs out", async () => {
  const { countUp, observers, tick } = load();
  const share = figure("97%", 97, { painted: false });
  countUp.countUpOnEntry(rootOf(share));
  observers[0].enter(0.6, share);
  await settle();
  roll(tick, countUp.HOLD_MS + 16);
  tick(300);
  assert.notEqual(share.textContent, "0%");
});

test("a figure resets once it is fully below the window and rolls again on re-entry", async () => {
  const { countUp, observers, tick, pending } = load();
  const share = figure("97%", 97);
  countUp.countUpOnEntry(rootOf(share));
  observers[0].enter(0.6, share);
  await settle();
  roll(tick, countUp.COUNT_UP_MS + 100);
  assert.equal(share.textContent, "97%");

  observers[0].leave(900, share);
  assert.equal(share.textContent, "0%");
  assert.equal(pending(), 0);

  observers[0].enter(0.6, share);
  await settle();
  roll(tick, countUp.COUNT_UP_MS + 100);
  assert.equal(share.textContent, "97%");
});

test("a figure leaving off the top, or barely in view, is left as it is", async () => {
  const { countUp, observers, tick } = load();
  const share = figure("97%", 97);
  countUp.countUpOnEntry(rootOf(share));
  observers[0].enter(0.6, share);
  await settle();
  roll(tick, countUp.COUNT_UP_MS + 100);

  observers[0].leave(-300, share);
  assert.equal(share.textContent, "97%");
  observers[0].enter(0.2, share);
  await settle();
  assert.equal(share.textContent, "97%");
});

test("a mid-roll figure that drops below the window restarts from zero", async () => {
  const { countUp, observers, tick, pending } = load();
  const share = figure("97%", 97);
  countUp.countUpOnEntry(rootOf(share));
  observers[0].enter(0.6, share);
  await settle();
  roll(tick, 500);
  assert.notEqual(share.textContent, "0%");

  observers[0].leave(900, share);
  assert.equal(share.textContent, "0%");
  assert.equal(pending(), 0, "the abandoned roll is cancelled");
});

test("figures without digits or a numeric target are ignored", () => {
  const { countUp, observers } = load();
  const words = figure("Many", 200);
  const noTarget = { textContent: "200", dataset: { countTo: "soon" } };
  countUp.countUpOnEntry(rootOf(words, noTarget));
  assert.equal(words.textContent, "Many");
  assert.equal(noTarget.textContent, "200");
  assert.equal(observers[0].watching.size, 0);
});

test("reduced motion, or no IntersectionObserver, leaves every figure alone", () => {
  const share = figure("97%", 97);
  load({ reducedMotion: true }).countUp.countUpOnEntry(rootOf(share));
  assert.equal(share.textContent, "97%");
  load({ observer: false }).countUp.countUpOnEntry(rootOf(share));
  assert.equal(share.textContent, "97%");
});
