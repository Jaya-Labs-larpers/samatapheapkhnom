import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = await readFile(
  new URL("../src/lib/butterflies/cursor.ts", import.meta.url),
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
const cursor = module.exports;

const FRAME = 1 / 60;

/** Steps the flight for `seconds`, calling `each` after every frame. */
function fly(flight, pointer, seconds, { hover = "none", dt = FRAME, each } = {}) {
  const frames = Math.round(seconds / dt);
  for (let i = 0; i < frames; i++) {
    cursor.stepCursorFlight(flight, pointer, dt, hover);
    each?.(flight, i);
  }
}

/** Where the butterfly sits on the (flattened) ring around the pointer. */
function ringPlace(flight, pointer) {
  const dx = flight.x - pointer.x;
  const dy = (flight.y - pointer.y) / cursor.RING_SQUASH;
  return { angle: Math.atan2(dy, dx), radius: Math.hypot(dx, dy) };
}

test("it circles a still pointer clockwise, once in about three seconds, on its ring", () => {
  const pointer = { x: 500, y: 400 };
  const flight = cursor.createCursorFlight(pointer);
  fly(flight, pointer, 1.5);

  let turned = 0;
  let last = ringPlace(flight, pointer).angle;
  fly(flight, pointer, (2 * Math.PI) / cursor.SPIN, {
    each: (f) => {
      const place = ringPlace(f, pointer);
      const step = Math.atan2(Math.sin(place.angle - last), Math.cos(place.angle - last));
      assert.ok(step > 0, "never turns back");
      assert.ok(Math.abs(place.radius - cursor.RING_RADIUS) < 1.5, `radius ${place.radius.toFixed(2)}`);
      turned += step;
      last = place.angle;
    },
  });
  assert.ok(Math.abs(turned - 2 * Math.PI) < 0.35, `turned ${turned.toFixed(2)} rad in one period`);
});

test("it takes off from rest beside the arrow's tip without a jump", () => {
  const pointer = { x: 500, y: 400 };
  const flight = cursor.createCursorFlight(pointer);
  const start = cursor.restingPoint(pointer);
  assert.ok(start.x < pointer.x && start.y < pointer.y, "rests up and to the left of the tip");
  assert.equal(flight.x, start.x);
  assert.equal(flight.y, start.y);

  let previous = { x: flight.x, y: flight.y };
  fly(flight, pointer, 1, {
    each: (f) => {
      assert.ok(Math.hypot(f.x - previous.x, f.y - previous.y) < 2, "under 2px a frame while taking off");
      previous = { x: f.x, y: f.y };
    },
  });
});

test("a pointer that leaps is followed along a smooth curve, not a jump", () => {
  const pointer = { x: 200, y: 400 };
  const flight = cursor.createCursorFlight(pointer);
  fly(flight, pointer, 1);
  pointer.x += 600;

  let previous = { x: flight.x, y: flight.y };
  fly(flight, pointer, 0.8, {
    each: (f, i) => {
      const moved = Math.hypot(f.x - previous.x, f.y - previous.y);
      if (i === 0) assert.ok(moved < 15, `first frame moves ${moved.toFixed(1)}px of a 600px gap`);
      assert.ok(moved <= (cursor.MAX_SPEED + 150) * FRAME, `a frame moves ${moved.toFixed(1)}px`);
      previous = { x: f.x, y: f.y };
    },
  });
  assert.ok(Math.abs(ringPlace(flight, pointer).radius - cursor.RING_RADIUS) < 3, "caught up within 0.8s");
});

test("it closes on a still target without overshooting", () => {
  const pointer = { x: 300, y: 500 };
  const flight = cursor.createCursorFlight(pointer);
  fly(flight, pointer, 1, { hover: "label" });
  pointer.x += 400;
  const goal = pointer.x + cursor.PERCH.x;
  let previous = flight.x;
  fly(flight, pointer, 1.5, {
    hover: "label",
    each: (f) => {
      assert.ok(f.x <= goal + 1e-6, "never passes the perch");
      assert.ok(f.x >= previous - 1e-6, "never backs off");
      previous = f.x;
    },
  });
  assert.ok(goal - flight.x < 0.5);
});

test("it flies the same at 30, 60 and 144 frames a second", () => {
  const run = (dt) => {
    const pointer = { x: 400, y: 400 };
    const flight = cursor.createCursorFlight(pointer);
    fly(flight, pointer, 1, { dt });
    pointer.x += 250;
    pointer.y -= 120;
    fly(flight, pointer, 1, { dt });
    return flight;
  };
  const [slow, normal, fast] = [1 / 30, 1 / 60, 1 / 144].map(run);
  for (const other of [slow, fast]) {
    const apart = Math.hypot(other.x - normal.x, other.y - normal.y);
    assert.ok(apart < 3, `${apart.toFixed(2)}px apart`);
  }
});

test("over a labelled card it perches above the pointer, and below it near the top of the window", () => {
  const pointer = { x: 600, y: 400 };
  const flight = cursor.createCursorFlight(pointer);
  fly(flight, pointer, 1.5, { hover: "label" });
  assert.ok(Math.abs(flight.x - (pointer.x + cursor.PERCH.x)) < 0.5);
  assert.ok(Math.abs(flight.y - (pointer.y + cursor.PERCH.y)) < 0.5);
  // The label hangs 18px under the butterfly and is about 24px tall: clear of the tip.
  assert.ok(cursor.PERCH.y + 18 + 24 < 0);

  const high = { x: 600, y: 30 };
  const nearTop = cursor.createCursorFlight(high);
  fly(nearTop, high, 1.5, { hover: "label" });
  assert.ok(nearTop.y > high.y, "holds below the pointer when there is no room above");
});

test("leaving a card picks the ring up from where it is", () => {
  const pointer = { x: 600, y: 400 };
  const flight = cursor.createCursorFlight(pointer);
  fly(flight, pointer, 1.5, { hover: "label" });
  let previous = { x: flight.x, y: flight.y };
  fly(flight, pointer, 1.5, {
    each: (f) => {
      assert.ok(Math.hypot(f.x - previous.x, f.y - previous.y) < 3, "no jump back onto the ring");
      previous = { x: f.x, y: f.y };
    },
  });
});

test("after the pointer rests it comes round to rest past the tip, slowing and never turning back", () => {
  const pointer = { x: 500, y: 500 };
  const flight = cursor.createCursorFlight(pointer);
  let angle = null;
  let spanBefore = cursor.cursorWingSpan(flight);
  let settledAt = null;
  fly(flight, pointer, cursor.REST_AFTER_S + 8, {
    each: (f, i) => {
      if (f.land !== null) {
        if (angle !== null) assert.ok(f.angle >= angle - 1e-9, "never turns back while landing");
        angle = f.angle;
        assert.ok(f.land - f.angle < 2 * Math.PI + 1.3, "at most one more lap before resting");
      }
      const span = cursor.cursorWingSpan(f);
      assert.ok(Math.abs(span - spanBefore) < 0.12, "the wings never snap open");
      spanBefore = span;
      if (settledAt === null && cursor.isSettled(f)) settledAt = (i + 1) * FRAME;
    },
  });
  assert.ok(settledAt !== null && settledAt < cursor.REST_AFTER_S + 6, `settled at ${settledAt}s`);
  const rest = cursor.restingPoint(pointer);
  assert.ok(Math.hypot(flight.x - rest.x, flight.y - rest.y) < 0.5);
  assert.ok(cursor.cursorWingSpan(flight) > 0.99, "rests with its wings open");
});

test("moving the pointer wakes a resting butterfly, and it takes off gently", () => {
  const pointer = { x: 500, y: 500 };
  const flight = cursor.createCursorFlight(pointer);
  fly(flight, pointer, cursor.REST_AFTER_S + 8);
  assert.equal(cursor.isSettled(flight), true);

  pointer.x += 5;
  fly(flight, pointer, FRAME);
  assert.equal(cursor.isSettled(flight), false);
  assert.ok(flight.spin < 0.2, "spin builds up rather than jumping to full speed");
  fly(flight, pointer, 2);
  assert.ok(flight.spin > cursor.SPIN * 0.95);
});

test("it banks into sideways movement and never past the limit", () => {
  for (const direction of [1, -1]) {
    const pointer = { x: 2000, y: 400 };
    const flight = cursor.createCursorFlight(pointer);
    let most = 0;
    for (let i = 0; i < 30; i++) {
      pointer.x += direction * 40;
      fly(flight, pointer, FRAME, { each: (f) => (most = Math.max(most, Math.abs(f.tilt))) });
    }
    assert.ok(Math.sign(flight.tilt) === direction, "leans the way it is flying");
    assert.ok(most <= cursor.MAX_TILT + 1e-9);
  }
});

test("it flaps faster over a link, and faster again when flying hard", () => {
  const phaseAfter = (hover, leap) => {
    const pointer = { x: 500, y: 500 };
    const flight = cursor.createCursorFlight(pointer);
    pointer.x += leap;
    fly(flight, pointer, 0.1, { hover });
    return flight.phase;
  };
  const drifting = phaseAfter("none", 0);
  assert.ok(phaseAfter("link", 0) > drifting);
  assert.ok(phaseAfter("none", 500) > drifting);
});

test("wing span stays between the closed fraction and fully open", () => {
  const pointer = { x: 0, y: 0 };
  const flight = cursor.createCursorFlight(pointer);
  fly(flight, pointer, 4, {
    each: (f) => {
      pointer.x += 3;
      const span = cursor.cursorWingSpan(f);
      assert.ok(span >= 0.35 - 1e-9 && span <= 1 + 1e-9);
    },
  });
});

test("a saved flight carries on from where the last page left it", () => {
  const pointer = { x: 640, y: 360 };
  const flight = cursor.createCursorFlight(pointer);
  fly(flight, pointer, 2.3);
  const saved = cursor.parseSavedCursor(JSON.stringify(cursor.saveCursor(flight, pointer)), {
    width: 1280,
    height: 800,
  });
  const restored = cursor.restoreCursorFlight(saved);
  assert.ok(Math.hypot(restored.x - flight.x, restored.y - flight.y) < 0.01);
  assert.ok(Math.abs(restored.spin - flight.spin) < 0.01);

  let previous = { x: restored.x, y: restored.y };
  fly(restored, pointer, 0.5, {
    each: (f) => {
      assert.ok(Math.hypot(f.x - previous.x, f.y - previous.y) < 3, "carries on without a jump");
      previous = { x: f.x, y: f.y };
    },
  });
});

test("a saved record is only trusted when it fits the new viewport", () => {
  const viewport = { width: 1280, height: 800 };
  assert.deepEqual({ ...cursor.parseSavedCursor('{"x":100,"y":200}', viewport) }, { x: 100, y: 200 });
  assert.equal(cursor.parseSavedCursor('{"x":2000,"y":200}', viewport), null);
  assert.equal(cursor.parseSavedCursor('{"x":"1","y":2}', viewport), null);
  assert.equal(cursor.parseSavedCursor("not json", viewport), null);
  assert.equal(cursor.parseSavedCursor(null, viewport), null);
  assert.deepEqual(
    { ...cursor.parseSavedCursor('{"x":1,"y":2,"bx":"3","by":4,"s":null}', viewport) },
    { x: 1, y: 2, by: 4 },
    "flight fields that are not numbers are dropped",
  );

  const bare = cursor.restoreCursorFlight({ x: 100, y: 200 });
  const rest = cursor.restingPoint({ x: 100, y: 200 });
  assert.deepEqual([bare.x, bare.y], [rest.x, rest.y], "a bare pointer starts at rest beside it");
});

test("the inline restore script places a bare pointer's butterfly at restingPoint", async () => {
  const component = await readFile(
    new URL("../src/components/media/ButterflyCursor.astro", import.meta.url),
    "utf8",
  );
  const [, dx, dy] = component.match(/saved\.x - ([\d.]+);[\s\S]*?saved\.y - ([\d.]+);/) ?? [];
  const rest = cursor.restingPoint({ x: 0, y: 0 });
  assert.equal(Number(dx), -Math.round(rest.x * 10) / 10);
  assert.equal(Number(dy), -Math.round(rest.y * 10) / 10);
});
