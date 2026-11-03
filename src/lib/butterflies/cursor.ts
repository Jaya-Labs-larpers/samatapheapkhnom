/**
 * The butterfly that keeps the mouse pointer company. Pure motion maths, so
 * it can be tested without a DOM; ButterflyCursor.astro owns the element.
 *
 * The system pointer stays visible and does the aiming. The butterfly circles
 * it, clockwise, on a slightly flattened ring. Over a card with a label it
 * perches just above the pointer so the label can be read, and once the
 * pointer has been still for REST_AFTER_S it slows, comes round to rest just
 * past the arrow's tip with its wings open, and the loop can stop.
 *
 * Every move goes through one critically damped spring, so the butterfly never
 * jumps and never overshoots: a fast flick leaves it trailing a little way
 * behind, catching up along a smooth curve. The spring is solved exactly for
 * each frame's length, so it flies the same at 30, 60 or 144 frames a second.
 */

export interface Point {
  x: number;
  y: number;
}

/** What the pointer is over: nothing special, something clickable, or a card with a label. */
export type Hover = 'none' | 'link' | 'label';

export interface CursorFlight {
  x: number;
  y: number;
  /** Velocity in px/s. */
  vx: number;
  vy: number;
  /** Place on the ring in radians; it grows clockwise on screen, 0 is to the right. */
  angle: number;
  /** How fast it goes round, rad/s. */
  spin: number;
  /** Ring radius now, px. */
  radius: number;
  /** Bank angle in radians; negative leans left. */
  tilt: number;
  /** Flap phase in radians, and how far the wings beat: 1 flying, 0 still and open. */
  phase: number;
  flap: number;
  /** Seconds since the pointer last moved. */
  idle: number;
  /** Where the pointer was last seen, to notice it moving. */
  seen: Point;
  /** False while perched, so the ring is picked up again from wherever it is. */
  circling: boolean;
  /** While coming to rest, the ring angle it will stop at; not wrapped, so it only counts down. */
  land: number | null;
}

export const RING_RADIUS = 40;
/** The glyph grows over a link, so the ring widens to keep the same clearance. */
export const LINK_RING_RADIUS = 46;
/** The ring is flattened a little, as if seen at an angle. */
export const RING_SQUASH = 0.8;
/** Once round in about 2.9s. */
export const SPIN = 2.2;
const SPIN_EASE = 3;
const RADIUS_EASE = 6;
/** The spring's smoothing time in seconds: it covers half of any gap in about 0.08s. */
export const SMOOTH_TIME = 0.1;
/**
 * The fastest it flies to catch up, px/s. A 60fps frame shows at most ~37px
 * of travel, so a big catch-up reads as a glide rather than a flicker.
 */
export const MAX_SPEED = 2200;
/** After the pointer has been still this long, the butterfly comes to rest. */
export const REST_AFTER_S = 10;
/** Where it rests: up and to the left, just past the tip of the system arrow. */
export const REST_ANGLE = -2.4;
/** It slows to a stop over this much of the ring, at a steady deceleration. */
const BRAKE = 1.2;
/** Over a labelled card it holds here, so the label beneath it sits above the pointer. */
export const PERCH: Point = { x: -8, y: -48 };
/** Near the top of the window there is no room above, so it holds below instead. */
export const PERCH_BELOW: Point = { x: 14, y: 40 };
export const PERCH_FLIP_Y = 80;
export const MAX_TILT = 0.45;
const TILT_RATE = 8;
/** Horizontal speed (px/s) at which the bank reaches MAX_TILT. */
const FULL_TILT_SPEED = 1000;
const FLAP_EASE = 3;
const IDLE_FLAP_HZ = 1.6;
const FLIGHT_FLAP_HZ = 4.5;
const HOVER_FLAP_HZ = 2.5;
/** Speed (px/s) that earns the full extra flap rate. */
const FULL_EFFORT_SPEED = 900;
/** A pointer that has moved less than this, in px, has not moved. */
const MOVE_EPSILON = 0.5;

const TAU = Math.PI * 2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
/** An angle in (-π, π]. */
const wrap = (angle: number) => angle - TAU * Math.ceil((angle - Math.PI) / TAU);

/** The point at `angle` on a ring of `radius` around `pointer`. */
export function ringPoint(pointer: Point, angle: number, radius: number): Point {
  return {
    x: pointer.x + Math.cos(angle) * radius,
    y: pointer.y + Math.sin(angle) * radius * RING_SQUASH,
  };
}

/** Where a butterfly resting beside a pointer at `pointer` sits. */
export function restingPoint(pointer: Point): Point {
  return ringPoint(pointer, REST_ANGLE, RING_RADIUS);
}

function perchFor(pointer: Point): Point {
  const perch = pointer.y < PERCH_FLIP_Y ? PERCH_BELOW : PERCH;
  return { x: pointer.x + perch.x, y: pointer.y + perch.y };
}

/** A butterfly that has just arrived beside the pointer: at rest, about to take off. */
export function createCursorFlight(pointer: Point): CursorFlight {
  const at = restingPoint(pointer);
  return {
    x: at.x,
    y: at.y,
    vx: 0,
    vy: 0,
    angle: REST_ANGLE,
    spin: 0,
    radius: RING_RADIUS,
    tilt: 0,
    phase: 0,
    flap: 1,
    idle: 0,
    seen: { x: pointer.x, y: pointer.y },
    circling: true,
    land: null,
  };
}

/**
 * Pulls the butterfly towards `target` along a critically damped spring,
 * solved exactly for `dt`. The spring never sees a gap wider than it could
 * close at MAX_SPEED, which caps the speed without ever aiming past the target.
 */
function springTo(flight: CursorFlight, target: Point, dt: number): void {
  const omega = 2 / SMOOTH_TIME;
  const decay = Math.exp(-omega * dt);
  let gapX = flight.x - target.x;
  let gapY = flight.y - target.y;
  const gap = Math.hypot(gapX, gapY);
  const reach = MAX_SPEED * SMOOTH_TIME;
  if (gap > reach) {
    gapX *= reach / gap;
    gapY *= reach / gap;
  }
  const goalX = flight.x - gapX;
  const goalY = flight.y - gapY;
  const pullX = flight.vx + gapX * omega;
  const pullY = flight.vy + gapY * omega;
  flight.x = goalX + (gapX + pullX * dt) * decay;
  flight.y = goalY + (gapY + pullY * dt) * decay;
  flight.vx = (flight.vx - pullX * omega * dt) * decay;
  flight.vy = (flight.vy - pullY * omega * dt) * decay;
}

/** The ring angle it will come to rest at: REST_ANGLE, one lap later if it is too close to stop in time. */
function landingAngle(flight: CursorFlight): number {
  const ahead = (((REST_ANGLE - flight.angle) % TAU) + TAU) % TAU;
  const stopping = BRAKE * (flight.spin / SPIN) ** 2;
  return flight.angle + (ahead + 1e-9 >= stopping ? ahead : ahead + TAU);
}

export function stepCursorFlight(
  flight: CursorFlight,
  pointer: Point,
  dt: number,
  hover: Hover = 'none',
): void {
  if (!(dt > 0)) return;

  if (Math.hypot(pointer.x - flight.seen.x, pointer.y - flight.seen.y) > MOVE_EPSILON) {
    flight.seen = { x: pointer.x, y: pointer.y };
    flight.idle = 0;
    flight.land = null;
  } else {
    flight.idle += dt;
  }
  const resting = flight.idle >= REST_AFTER_S;

  let target: Point;
  let flapGoal = resting ? 0 : 1;
  if (hover === 'label') {
    target = perchFor(pointer);
    flight.circling = false;
    flight.land = null;
    flight.spin = 0;
  } else {
    if (!flight.circling) {
      // Pick the ring up from wherever the butterfly is, so leaving a card never jumps it.
      flight.angle = Math.atan2((flight.y - pointer.y) / RING_SQUASH, flight.x - pointer.x);
      flight.circling = true;
    }
    const radiusGoal = hover === 'link' ? LINK_RING_RADIUS : RING_RADIUS;
    flight.radius += (radiusGoal - flight.radius) * ease(RADIUS_EASE, dt);
    flight.spin += (SPIN - flight.spin) * ease(SPIN_EASE, dt);

    if (resting) {
      flight.land ??= landingAngle(flight);
      const remaining = flight.land - flight.angle;
      // spin = SPIN·√(remaining/BRAKE) is a steady deceleration that reaches zero exactly at the spot.
      flight.spin = Math.min(flight.spin, SPIN * Math.sqrt(Math.max(remaining, 0) / BRAKE));
      flight.angle = Math.min(flight.angle + flight.spin * dt, flight.land);
      flapGoal = remaining > BRAKE ? 1 : 0;
    } else {
      flight.angle = wrap(flight.angle + flight.spin * dt);
    }
    target = ringPoint(pointer, flight.angle, flight.radius);
  }

  springTo(flight, target, dt);

  const lean = clamp(flight.vx / FULL_TILT_SPEED, -1, 1) * MAX_TILT;
  flight.tilt += (lean - flight.tilt) * ease(TILT_RATE, dt);

  flight.flap += (flapGoal - flight.flap) * ease(FLAP_EASE, dt);
  const effort = Math.min(Math.hypot(flight.vx, flight.vy) / FULL_EFFORT_SPEED, 1);
  const hz = IDLE_FLAP_HZ + effort * FLIGHT_FLAP_HZ + (hover === 'none' ? 0 : HOVER_FLAP_HZ);
  flight.phase = (flight.phase + TAU * hz * dt) % TAU;
}

/** True once the butterfly is at rest beside a still pointer, wings open, and the loop can stop. */
export function isSettled(flight: CursorFlight): boolean {
  if (flight.idle < REST_AFTER_S || flight.flap > 0.01 || Math.abs(flight.tilt) > 0.01)
    return false;
  if (Math.hypot(flight.vx, flight.vy) > 2) return false;
  return !flight.circling || (flight.land !== null && flight.land - flight.angle < 1e-3);
}

/** Wing span fraction at the current phase; 1 is fully open. */
export function cursorWingSpan(flight: CursorFlight, closed = 0.35): number {
  return 1 - (1 - closed) * flight.flap * (0.5 - 0.5 * Math.cos(flight.phase));
}

/* ---------------------------------------------------------------------------
   Carrying the butterfly from one page to the next
   ------------------------------------------------------------------------- */

export const CURSOR_STORAGE_KEY = 'sko-cursor';

/**
 * The pointer (`x`, `y`) and, when known, the butterfly's own flight. `x`, `y`,
 * `bx` and `by` are read by the inline restore script in ButterflyCursor.astro
 * before first paint, so they stay short and flat.
 */
export interface SavedCursor {
  x: number;
  y: number;
  bx?: number;
  by?: number;
  vx?: number;
  vy?: number;
  /** Spin, idle seconds and flap. */
  s?: number;
  i?: number;
  f?: number;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function saveCursor(flight: CursorFlight, pointer: Point): SavedCursor {
  return {
    x: Math.round(pointer.x),
    y: Math.round(pointer.y),
    bx: round(flight.x),
    by: round(flight.y),
    vx: round(flight.vx),
    vy: round(flight.vy),
    s: round(flight.spin),
    i: round(Math.min(flight.idle, REST_AFTER_S)),
    f: round(flight.flap),
  };
}

/**
 * Only trusted when the pointer fits the new viewport; the inline restore
 * script applies the same test. Any flight field that is missing or not a
 * finite number is dropped, and the butterfly starts that part afresh.
 */
export function parseSavedCursor(
  raw: string | null,
  viewport: { width: number; height: number },
): SavedCursor | null {
  if (!raw) return null;
  let saved: unknown;
  try {
    saved = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!saved || typeof saved !== 'object') return null;
  const fields = saved as Record<string, unknown>;
  const { x, y } = fields;
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y))
    return null;
  if (x < 0 || y < 0 || x > viewport.width || y > viewport.height) return null;
  const out: SavedCursor = { x, y };
  for (const key of ['bx', 'by', 'vx', 'vy', 's', 'i', 'f'] as const) {
    const value = fields[key];
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
  }
  return out;
}

/**
 * The flight the previous page left, carried on; a bare pointer starts one at
 * rest beside it. The ring is picked up from where the butterfly is, which
 * also covers leaving a page while it was perched over a card.
 */
export function restoreCursorFlight(saved: SavedCursor): CursorFlight {
  const pointer = { x: saved.x, y: saved.y };
  const flight = createCursorFlight(pointer);
  if (saved.bx === undefined || saved.by === undefined) return flight;
  flight.x = saved.bx;
  flight.y = saved.by;
  flight.vx = saved.vx ?? 0;
  flight.vy = saved.vy ?? 0;
  flight.circling = false;
  flight.spin = clamp(saved.s ?? 0, 0, SPIN);
  flight.idle = clamp(saved.i ?? 0, 0, REST_AFTER_S);
  flight.flap = clamp(saved.f ?? 1, 0, 1);
  return flight;
}
