/**
 * The hero's flock: three logo butterflies of one size that live inside the
 * hero band of the home page and of every page hero.
 *
 * Each flies on its own — its own resting spot, wandering loop, wing beat and
 * pace — and together they keep the visitor company: while the mouse is
 * moving they trail it, each holding its own slowly turning place around it,
 * and once it has been still for a while they drift back out to the edges.
 *
 * Positions are pixels within the hero; the "viewport" here is the hero's box. Framework-free and deterministic for a given
 * input sequence, so it can be unit-tested and its state serialised across
 * page loads.
 */

export interface Viewport {
  width: number;
  height: number;
}

export interface Pointer {
  x: number;
  y: number;
}

export interface Flyer {
  /** Which edge it rests against. */
  side: 'left' | 'right';
  /** Width in CSS px. */
  size: number;
  /** Resting spot. */
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Wing-flap phase, radians, and resting beats per second. */
  phase: number;
  flapHz: number;
  /** Lean into horizontal movement, radians. */
  tilt: number;
  /** Its place around the pointer: starting angle, radius, and turn rate. */
  ring: number;
  ringR: number;
  orbit: number;
  following: boolean;
  /** Two slow oscillators give each one its own wandering loop. */
  w1: number;
  w2: number;
  p1: number;
  p2: number;
}

export interface Flock {
  time: number;
  viewport: Viewport;
  flyers: Flyer[];
}

/** Phones and small tablets: small, edge-hugging, and not pointer-driven. */
export const COMPACT_BELOW = 768;

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Slot {
  side: 'left' | 'right';
  /** Resting height as a share of the viewport. */
  y: number;
  flapHz: number;
  ring: number;
  /** Radius around the pointer, as a multiple of the butterfly's width. */
  ringR: number;
  orbit: number;
  w1: number;
  w2: number;
  p1: number;
  p2: number;
}

/*
 * Fixed rather than random, so every visitor meets the same flock, but every
 * number differs between the three so none of them moves in step with another.
 */
const SLOTS: readonly Slot[] = [
  {
    side: 'right',
    y: 0.3,
    flapHz: 1.0,
    ring: 0.3,
    ringR: 0.95,
    orbit: 0.35,
    w1: 0.42,
    w2: 0.7,
    p1: 0.3,
    p2: 1.9,
  },
  {
    side: 'left',
    y: 0.5,
    flapHz: 1.15,
    ring: 2.4,
    ringR: 1.2,
    orbit: -0.28,
    w1: 0.53,
    w2: 0.61,
    p1: 2.2,
    p2: 0.8,
  },
  {
    side: 'right',
    y: 0.76,
    flapHz: 0.9,
    ring: 4.4,
    ringR: 1.05,
    orbit: 0.22,
    w1: 0.37,
    w2: 0.83,
    p1: 4.1,
    p2: 3.0,
  },
];

export function isCompact(viewport: Viewport): boolean {
  return viewport.width < COMPACT_BELOW;
}

/** Width in CSS px, shared by all three. */
export function flyerSize(viewport: Viewport): number {
  if (isCompact(viewport)) return 44;
  return clamp(viewport.width * 0.11, 120, 180);
}

/**
 * The resting x. On phones they peek in from the very edge so they never sit
 * over running text; on larger screens they rest just inside it.
 */
function restingX(side: 'left' | 'right', size: number, viewport: Viewport): number {
  const inset = isCompact(viewport) ? size * 0.35 : 32 + size / 2;
  return side === 'left' ? inset : viewport.width - inset;
}

export function createFlock(viewport: Viewport): Flock {
  const size = flyerSize(viewport);
  const flyers = SLOTS.map((slot): Flyer => {
    const hx = restingX(slot.side, size, viewport);
    const hy = slot.y * viewport.height;
    return {
      side: slot.side,
      size,
      hx,
      hy,
      x: hx,
      y: hy,
      vx: 0,
      vy: 0,
      phase: slot.p1,
      flapHz: slot.flapHz,
      tilt: 0,
      ring: slot.ring,
      ringR: slot.ringR,
      orbit: slot.orbit,
      following: false,
      w1: slot.w1,
      w2: slot.w2,
      p1: slot.p1,
      p2: slot.p2,
    };
  });
  return { time: 0, viewport: { ...viewport }, flyers };
}

/** Fit the flock to a new viewport, keeping each flyer where it was, proportionally. */
export function resizeFlock(flock: Flock, viewport: Viewport): void {
  const sx = viewport.width / (flock.viewport.width || viewport.width);
  const sy = viewport.height / (flock.viewport.height || viewport.height);
  const size = flyerSize(viewport);
  for (const flyer of flock.flyers) {
    flyer.size = size;
    flyer.hx = restingX(flyer.side, size, viewport);
    flyer.hy *= sy;
    flyer.x *= sx;
    flyer.y *= sy;
  }
  flock.viewport = { ...viewport };
}

export interface StepInput {
  /**
   * Where to keep the visitor company, in hero px, or null to fly free.
   * The caller passes null once the mouse has been still for a while, or has
   * left the hero.
   */
  pointer: Pointer | null;
}

export function stepFlock(flock: Flock, dt: number, input: StepInput): void {
  flock.time += dt;
  const t = flock.time;
  const { width, height } = flock.viewport;
  const compact = isCompact(flock.viewport);
  const pointer = compact ? null : input.pointer;

  for (const f of flock.flyers) {
    f.following = pointer !== null;

    let tx: number;
    let ty: number;
    if (pointer) {
      // Its own place around the pointer, slowly turning, plus its own wobble,
      // so the three trail the mouse like companions rather than a formation.
      const a = f.ring + t * f.orbit;
      const r = f.ringR * f.size;
      tx = pointer.x + Math.cos(a) * r + Math.sin(t * f.w2 + f.p2) * 24;
      ty = pointer.y + Math.sin(a) * r * 0.75 + Math.cos(t * f.w1 + f.p1) * 20;
    } else {
      const across = compact ? 3 : 40;
      const along = compact ? 18 : 70;
      tx = f.hx + Math.sin(t * f.w1 + f.p1) * across;
      ty = f.hy + Math.cos(t * f.w2 + f.p2) * along;
    }

    // Following is quicker but still lags, which is what makes it read as a
    // butterfly catching up rather than a cursor decoration.
    const maxSpeed = f.following ? 300 : 150;
    const maxForce = f.following ? 650 : 380;
    const dx = tx - f.x;
    const dy = ty - f.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = Math.min(maxSpeed, dist * 2);
    let ax = (dx / dist) * speed - f.vx;
    let ay = (dy / dist) * speed - f.vy;
    const a = Math.hypot(ax, ay);
    if (a > maxForce) {
      ax = (ax / a) * maxForce;
      ay = (ay / a) * maxForce;
    }
    f.vx += ax * dt;
    f.vy += ay * dt;
  }

  // Keep them from overlapping one another.
  const flyers = flock.flyers;
  for (let i = 0; i < flyers.length; i++) {
    for (let j = i + 1; j < flyers.length; j++) {
      const a = flyers[i]!;
      const b = flyers[j]!;
      const gap = (a.size + b.size) * 0.45;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d >= gap || d === 0) continue;
      const push = ((gap - d) / gap) * 260 * dt;
      a.vx -= (dx / d) * push;
      a.vy -= (dy / d) * push;
      b.vx += (dx / d) * push;
      b.vy += (dy / d) * push;
    }
  }

  for (const f of flyers) {
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    // Never lost outside the hero.
    f.x = clamp(f.x, -f.size * 0.4, width + f.size * 0.4);
    f.y = clamp(f.y, -f.size * 0.2, height + f.size * 0.2);
    const lean = clamp(f.vx * 0.003, -0.3, 0.3);
    f.tilt += (lean - f.tilt) * Math.min(1, dt * 4);
    const effort = Math.hypot(f.vx, f.vy) / 300;
    f.phase += TAU * f.flapHz * (1 + effort) * dt;
  }
}

/** Wing span fraction at the flyer's flap phase; 1 is fully open. */
export function wingSpan(flyer: Flyer, closed = 0.4): number {
  return 1 - (1 - closed) * (0.5 - 0.5 * Math.cos(flyer.phase));
}

/* ---------------------------------------------------------------------------
   Carrying the flock from one page to the next
   ------------------------------------------------------------------------- */

export const STORAGE_KEY = 'sko-flock';

/**
 * What the next page needs to draw the flock exactly where this one left it.
 * `s`, `x`, `y`, `r` and `k` are read by the inline restore script in
 * ButterflyField before first paint, so they stay short and flat.
 */
export interface SavedFlock {
  w: number;
  h: number;
  t: number;
  f: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    hy: number;
    phase: number;
    /** Size, tilt and wing span, for the restore script. */
    s: number;
    r: number;
    k: number;
  }[];
}

export function saveFlock(flock: Flock): SavedFlock {
  return {
    w: flock.viewport.width,
    h: flock.viewport.height,
    t: flock.time,
    f: flock.flyers.map((f) => ({
      x: f.x,
      y: f.y,
      vx: f.vx,
      vy: f.vy,
      hy: f.hy,
      phase: f.phase,
      s: f.size,
      r: f.tilt,
      k: wingSpan(f),
    })),
  };
}

/** Rebuild a flock from a saved one, rescaled if the viewport changed size. */
export function restoreFlock(saved: SavedFlock, viewport: Viewport): Flock {
  const flock = createFlock({ width: saved.w, height: saved.h });
  flock.time = saved.t;
  flock.flyers.forEach((f, i) => {
    const s = saved.f[i];
    if (!s) return;
    f.x = s.x;
    f.y = s.y;
    f.vx = s.vx;
    f.vy = s.vy;
    f.hy = s.hy;
    f.phase = s.phase;
    f.tilt = s.r;
  });
  resizeFlock(flock, viewport);
  return flock;
}

/** A saved flock of a different shape (an older build) is ignored. */
export function parseSavedFlock(raw: string | null): SavedFlock | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as SavedFlock;
    const valid =
      Number.isFinite(value.w) &&
      Number.isFinite(value.h) &&
      Array.isArray(value.f) &&
      value.f.length === SLOTS.length &&
      value.f.every((f) => Number.isFinite(f.x) && Number.isFinite(f.y));
    return valid ? value : null;
  } catch {
    return null;
  }
}
