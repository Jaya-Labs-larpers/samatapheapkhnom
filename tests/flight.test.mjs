import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../src/lib/butterflies/flight.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
  },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(compiled, { module, exports: module.exports });
const flight = module.exports;

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };
const still = { pointer: null };

function run(flock, seconds, input = still) {
  for (let i = 0; i < seconds * 60; i++) flight.stepFlock(flock, 1 / 60, input);
}

test("three butterflies, all one size", () => {
  const { flyers } = flight.createFlock(desktop);
  assert.equal(flyers.length, 3);
  assert.equal(new Set(flyers.map((f) => f.size)).size, 1);
  assert.equal(flyers[0].size, flight.flyerSize(desktop));
  assert.ok(flyers[0].size >= 120);
});

test("on a phone they are small and keep to the edges", () => {
  const { flyers } = flight.createFlock(phone);
  for (const f of flyers) {
    assert.ok(f.size <= 44);
    const fromEdge = Math.min(f.hx, phone.width - f.hx);
    assert.ok(fromEdge <= 16, `rests ${fromEdge}px from the edge`);
  }
});

test("they stay inside the hero, however far a pointer pulls them", () => {
  const flock = flight.createFlock(desktop);
  run(flock, 6, { pointer: { x: 700, y: desktop.height + 600 } });
  for (const f of flock.flyers) {
    assert.ok(f.y <= desktop.height + f.size * 0.2);
  }
});

test("they follow a moving mouse from anywhere, each keeping its own place", () => {
  const flock = flight.createFlock(desktop);
  const pointer = { x: 300, y: 700 };
  run(flock, 6, { pointer });
  for (const f of flock.flyers) {
    assert.ok(f.following);
    const d = Math.hypot(f.x - pointer.x, f.y - pointer.y);
    assert.ok(d < f.size * 2, `${Math.round(d)}px from the pointer`);
  }
  const [a, b] = flock.flyers;
  assert.ok(
    Math.hypot(a.x - b.x, a.y - b.y) > a.size * 0.5,
    "they do not stack",
  );
});

test("with no mouse to follow they fly back to the edges", () => {
  const flock = flight.createFlock(desktop);
  run(flock, 4, { pointer: { x: 700, y: 450 } });
  run(flock, 10);
  for (const f of flock.flyers) {
    assert.ok(!f.following);
    assert.ok(Math.abs(f.x - f.hx) < 80);
  }
});

test("on a phone the mouse is ignored", () => {
  const small = flight.createFlock(phone);
  run(small, 1, { pointer: { x: 200, y: 400 } });
  assert.ok(small.flyers.every((f) => !f.following));
});

test("a saved flock comes back exactly where it was", () => {
  const flock = flight.createFlock(desktop);
  run(flock, 2, { pointer: { x: 700, y: 400 } });
  const saved = JSON.parse(JSON.stringify(flight.saveFlock(flock)));
  const restored = flight.restoreFlock(saved, desktop);
  restored.flyers.forEach((f, i) => {
    assert.equal(f.x, flock.flyers[i].x);
    assert.equal(f.y, flock.flyers[i].y);
  });
});

test("a malformed or older-shaped save is ignored rather than trusted", () => {
  assert.equal(flight.parseSavedFlock("{nope"), null);
  assert.equal(flight.parseSavedFlock('{"w":1,"h":1,"f":[]}'), null);
  const four = {
    w: 1,
    h: 1,
    f: Array.from({ length: 4 }, () => ({ x: 0, y: 0 })),
  };
  assert.equal(flight.parseSavedFlock(JSON.stringify(four)), null);
  assert.equal(flight.parseSavedFlock(null), null);
});
