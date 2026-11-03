/**
 * A swarm of small logo butterflies that drift near home, and gather around a
 * pointer when one hovers over the field.
 *
 * Framework-free and deterministic: the same seed, field size, time steps and
 * pointer path always produce the same picture. That lets the website run it
 * live on a canvas, and lets the Remotion project in /video render exactly the
 * same swarm frame by frame into a video.
 *
 * The drawing is the logo butterfly (see ./shape) — only its size changes.
 */
import {
  BUTTERFLY_VIEWBOX,
  LEFT_WING,
  RIGHT_WING,
  WING_DARK,
  WING_HINGE,
  WING_PALE,
  type WingPaths,
} from './shape';

export interface SwarmOptions {
  /** Any integer. Same seed, same swarm. */
  seed: number;
  /** Field area, in CSS px², per butterfly. Lower means denser. */
  areaPerButterfly: number;
  minCount: number;
  maxCount: number;
  /** Butterfly width range in CSS px. The logo butterfly is 100 wide. */
  minSize: number;
  maxSize: number;
  /** Pointer distance (px) at which a butterfly starts heading for the pointer. */
  gatherRadius: number;
  /** Pointer distance (px) at which a gathered butterfly lets go again. */
  releaseRadius: number;
}

export const DEFAULT_SWARM_OPTIONS: SwarmOptions = {
  seed: 7,
  areaPerButterfly: 15000,
  minCount: 16,
  maxCount: 96,
  minSize: 16,
  maxSize: 30,
  gatherRadius: 280,
  releaseRadius: 380,
};

export interface Pointer {
  x: number;
  y: number;
}

export interface Butterfly {
  /** Home, as a fraction of the field, so it survives resizes. */
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Width in CSS px. */
  size: number;
  /** Wing-flap phase, radians. */
  phase: number;
  /** Resting flaps per second. */
  flapHz: number;
  /** Two slow oscillators give each butterfly its own wandering loop. */
  w1: number;
  w2: number;
  p1: number;
  p2: number;
  /** Slot on the ring around the pointer, radians, and its radius. */
  ring: number;
  ringR: number;
  gathered: boolean;
  /** Lean into horizontal movement, radians. */
  tilt: number;
}

export interface Swarm {
  width: number;
  height: number;
  time: number;
  butterflies: Butterfly[];
  options: SwarmOptions;
  /** Deterministic RNG, consumed when butterflies are added on resize. */
  next: () => number;
}

/* ---------------------------------------------------------------------------
   Random numbers
   ------------------------------------------------------------------------- */

/** mulberry32 — tiny, seedable, good enough for placing butterflies. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const TAU = Math.PI * 2;

/* ---------------------------------------------------------------------------
   Building the swarm
   ------------------------------------------------------------------------- */

export function targetCount(width: number, height: number, options: SwarmOptions): number {
  const byArea = Math.round((width * height) / options.areaPerButterfly);
  return clamp(byArea, options.minCount, options.maxCount);
}

/**
 * Homes are spread with a few rejection-sampling tries each, so the field reads
 * as scattered rather than clumped, without the regularity of a grid.
 */
function pickHome(existing: Butterfly[], next: () => number): { hx: number; hy: number } {
  let best = { hx: next(), hy: next() };
  let bestGap = -1;
  for (let attempt = 0; attempt < 6; attempt++) {
    const hx = lerp(0.03, 0.97, next());
    const hy = lerp(0.05, 0.95, next());
    let gap = Infinity;
    for (const b of existing) {
      const dx = b.hx - hx;
      const dy = b.hy - hy;
      gap = Math.min(gap, dx * dx + dy * dy);
    }
    if (gap > bestGap) {
      bestGap = gap;
      best = { hx, hy };
    }
  }
  return best;
}

function makeButterfly(swarm: Swarm): Butterfly {
  const { next, options } = swarm;
  const { hx, hy } = pickHome(swarm.butterflies, next);
  // Skew toward the small end so the field feels like many, with a few larger.
  const size = lerp(options.minSize, options.maxSize, next() ** 1.6);
  const ringR = lerp(30, 100, next());
  return {
    hx,
    hy,
    x: hx * swarm.width,
    y: hy * swarm.height,
    vx: 0,
    vy: 0,
    size,
    phase: next() * TAU,
    flapHz: lerp(2.2, 3.2, next()),
    w1: lerp(0.35, 0.7, next()),
    w2: lerp(0.5, 1.1, next()),
    p1: next() * TAU,
    p2: next() * TAU,
    ring: next() * TAU,
    ringR,
    gathered: false,
    tilt: 0,
  };
}

export function createSwarm(
  width: number,
  height: number,
  overrides: Partial<SwarmOptions> = {},
): Swarm {
  const options = { ...DEFAULT_SWARM_OPTIONS, ...overrides };
  const swarm: Swarm = {
    width,
    height,
    time: 0,
    butterflies: [],
    options,
    next: mulberry32(options.seed),
  };
  resizeSwarm(swarm, width, height);
  return swarm;
}

/** Fit the swarm to a new field size, keeping every butterfly where it was. */
export function resizeSwarm(swarm: Swarm, width: number, height: number): void {
  const sx = swarm.width > 0 ? width / swarm.width : 1;
  const sy = swarm.height > 0 ? height / swarm.height : 1;
  swarm.width = width;
  swarm.height = height;
  for (const b of swarm.butterflies) {
    b.x *= sx;
    b.y *= sy;
  }
  const count = targetCount(width, height, swarm.options);
  while (swarm.butterflies.length > count) swarm.butterflies.pop();
  while (swarm.butterflies.length < count) swarm.butterflies.push(makeButterfly(swarm));
  // Draw small ones first so the larger, nearer ones sit on top.
  swarm.butterflies.sort((a, b) => a.size - b.size);
}

/* ---------------------------------------------------------------------------
   Motion
   ------------------------------------------------------------------------- */

const IDLE_SPEED = 26; // px/s while wandering
const GATHER_SPEED = 260; // px/s while heading for the pointer
const IDLE_FORCE = 60; // px/s² — gentle, so wandering stays soft
const GATHER_FORCE = 900;

/**
 * Advance the swarm by `dt` seconds. `pointer` is the hover position in field
 * pixels, or null when nothing is hovering.
 */
export function stepSwarm(swarm: Swarm, dt: number, pointer: Pointer | null): void {
  const { butterflies, options } = swarm;
  swarm.time += dt;
  const t = swarm.time;
  const gatherSq = options.gatherRadius ** 2;
  const releaseSq = options.releaseRadius ** 2;

  for (const b of butterflies) {
    // Where this butterfly wants to be.
    let tx: number;
    let ty: number;
    const drift = 14 + b.size * 0.8;

    if (pointer) {
      const dx = pointer.x - b.x;
      const dy = pointer.y - b.y;
      const dSq = dx * dx + dy * dy;
      if (!b.gathered && dSq < gatherSq) b.gathered = true;
      else if (b.gathered && dSq > releaseSq) b.gathered = false;
    } else {
      b.gathered = false;
    }

    if (pointer && b.gathered) {
      // A loose, slowly turning ring around the pointer — a cloud, not a pile.
      const a = b.ring + t * 0.55;
      tx = pointer.x + Math.cos(a) * b.ringR + Math.sin(t * b.w2 + b.p2) * 6;
      ty = pointer.y + Math.sin(a) * b.ringR * 0.8 + Math.sin(t * b.w1 + b.p1) * 6;
    } else {
      // A small wandering loop around home.
      tx =
        b.hx * swarm.width +
        Math.sin(t * b.w1 + b.p1) * drift +
        Math.sin(t * b.w2 * 1.7 + b.p2) * drift * 0.4;
      ty =
        b.hy * swarm.height +
        Math.cos(t * b.w1 * 0.8 + b.p2) * drift * 0.7 +
        Math.cos(t * b.w2 + b.p1) * drift * 0.3;
    }

    const maxSpeed = b.gathered ? GATHER_SPEED : IDLE_SPEED;
    const maxForce = b.gathered ? GATHER_FORCE : IDLE_FORCE;

    let dx = tx - b.x;
    let dy = ty - b.y;
    const dist = Math.hypot(dx, dy) || 1;
    // Slow down on approach so nothing overshoots and jitters.
    const speed = Math.min(maxSpeed, dist * 2.2);
    dx = (dx / dist) * speed - b.vx;
    dy = (dy / dist) * speed - b.vy;
    const f = Math.hypot(dx, dy);
    if (f > maxForce) {
      dx = (dx / f) * maxForce;
      dy = (dy / f) * maxForce;
    }
    b.vx += dx * dt;
    b.vy += dy * dt;
  }

  // Keep neighbours from overlapping. n ≤ ~100, so the pair loop is cheap.
  for (let i = 0; i < butterflies.length; i++) {
    const a = butterflies[i]!;
    for (let j = i + 1; j < butterflies.length; j++) {
      const c = butterflies[j]!;
      const minGap = (a.size + c.size) * 0.55;
      const dx = c.x - a.x;
      const dy = c.y - a.y;
      const dSq = dx * dx + dy * dy;
      if (dSq >= minGap * minGap || dSq === 0) continue;
      const d = Math.sqrt(dSq);
      const push = ((minGap - d) / minGap) * 220 * dt;
      const ux = dx / d;
      const uy = dy / d;
      a.vx -= ux * push;
      a.vy -= uy * push;
      c.vx += ux * push;
      c.vy += uy * push;
    }
  }

  for (const b of butterflies) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Soft walls: nudge back rather than clamp, so nothing sticks to an edge.
    const m = b.size;
    if (b.x < m) b.vx += (m - b.x) * 4 * dt;
    if (b.x > swarm.width - m) b.vx -= (b.x - (swarm.width - m)) * 4 * dt;
    if (b.y < m) b.vy += (m - b.y) * 4 * dt;
    if (b.y > swarm.height - m) b.vy -= (b.y - (swarm.height - m)) * 4 * dt;

    // Lean into sideways movement, a few degrees at most.
    const lean = clamp(b.vx * 0.0035, -0.24, 0.24);
    b.tilt = lerp(b.tilt, lean, Math.min(1, dt * 4));

    // Wings beat faster when the butterfly is working harder.
    const effort = Math.hypot(b.vx, b.vy) / GATHER_SPEED;
    b.phase += TAU * b.flapHz * (1 + effort * 1.2) * dt;
  }
}

/* ---------------------------------------------------------------------------
   Drawing
   ------------------------------------------------------------------------- */

interface CompiledWing {
  pale: Path2D[];
  dark: Path2D[];
}

let compiled: { left: CompiledWing; right: CompiledWing } | null = null;

function compile(wing: WingPaths): CompiledWing {
  return {
    pale: wing.pale.map((d) => new Path2D(d)),
    dark: wing.dark.map((d) => new Path2D(d)),
  };
}

function wings() {
  if (!compiled) compiled = { left: compile(LEFT_WING), right: compile(RIGHT_WING) };
  return compiled;
}

function drawWing(ctx: CanvasRenderingContext2D, wing: CompiledWing, flap: number): void {
  ctx.save();
  ctx.translate(WING_HINGE.x, WING_HINGE.y);
  ctx.scale(flap, 1);
  ctx.translate(-WING_HINGE.x, -WING_HINGE.y);
  ctx.fillStyle = WING_PALE;
  for (const p of wing.pale) ctx.fill(p);
  ctx.fillStyle = WING_DARK;
  for (const p of wing.dark) ctx.fill(p);
  ctx.restore();
}

/** Draw one butterfly as vector paths, hinge at the origin, `size` CSS px wide. */
function drawVector(ctx: CanvasRenderingContext2D, size: number, flap: number): void {
  const { left, right } = wings();
  const s = size / BUTTERFLY_VIEWBOX.width;
  ctx.save();
  ctx.scale(s, s);
  ctx.translate(-WING_HINGE.x, -WING_HINGE.y);
  drawWing(ctx, left, flap);
  drawWing(ctx, right, flap);
  ctx.restore();
}

/* Sprites ------------------------------------------------------------------

   Filling eight vector paths per butterfly, up to ~100 butterflies, every
   frame, is the expensive part of the animation. The wings only ever take a
   handful of distinct shapes (the flap is a smooth loop), and sizes cluster,
   so each (flap step, size, pixel ratio) is rasterised once — from the very
   same paths — and blitted after that. drawImage of a small bitmap is an
   order of magnitude cheaper than the fills, and the result is pixel-for-
   pixel what the vector draw produced at that scale.

   The cache is lazy and bounded: FLAP_STEPS × (maxSize − minSize + 1) tiny
   canvases, a few hundred KB at most. Where no canvas can be created (a
   non-browser test runner) drawing silently falls back to the vector path. */

const FLAP_STEPS = 12;
const FLAP_MIN = 0.74; // wings never close past this fraction of their span
/** Padding so anti-aliased edges are not clipped at the sprite border. */
const SPRITE_PAD = 2;

interface Sprite {
  image: CanvasImageSource;
  /** Hinge position inside the sprite, in sprite pixels. */
  hx: number;
  hy: number;
  /** Sprite dimensions in sprite pixels. */
  w: number;
  h: number;
}

const sprites = new Map<string, Sprite | null>();

function makeSpriteCanvas(
  w: number,
  h: number,
): { canvas: CanvasImageSource; ctx: CanvasRenderingContext2D } | null {
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    return ctx ? { canvas, ctx } : null;
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D | null;
    return ctx ? { canvas, ctx } : null;
  }
  return null;
}

function sprite(size: number, step: number, pixelRatio: number): Sprite | null {
  const key = `${size}:${step}:${pixelRatio}`;
  const hit = sprites.get(key);
  if (hit !== undefined) return hit;

  const s = size / BUTTERFLY_VIEWBOX.width;
  const w = Math.ceil((BUTTERFLY_VIEWBOX.width * s + SPRITE_PAD * 2) * pixelRatio);
  const h = Math.ceil((BUTTERFLY_VIEWBOX.height * s + SPRITE_PAD * 2) * pixelRatio);
  const hx = (WING_HINGE.x * s + SPRITE_PAD) * pixelRatio;
  const hy = (WING_HINGE.y * s + SPRITE_PAD) * pixelRatio;

  const made = makeSpriteCanvas(w, h);
  if (!made) {
    sprites.set(key, null);
    return null;
  }
  const flap = flapAt(step);
  made.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, hx, hy);
  drawVector(made.ctx, size, flap);
  const out: Sprite = { image: made.canvas, hx, hy, w, h };
  sprites.set(key, out);
  return out;
}

/** Wing span fraction for a quantised flap step; step 0 is fully open. */
function flapAt(step: number): number {
  const phase = (step / FLAP_STEPS) * TAU;
  return 1 - (1 - FLAP_MIN) * (0.5 - 0.5 * Math.cos(phase));
}

export interface DrawOptions {
  /**
   * Device pixels per CSS pixel the sprites should be rasterised at. Pass the
   * canvas's own ratio so bitmaps stay crisp; defaults to 1.
   */
  pixelRatio?: number;
  /** Force the vector path (slower, exact). Sprites are used by default. */
  sprites?: boolean;
}

/**
 * Draw the swarm in CSS pixels. The caller owns the canvas size, device-pixel
 * scaling and clearing.
 */
export function drawSwarm(
  ctx: CanvasRenderingContext2D,
  swarm: Swarm,
  options: DrawOptions = {},
): void {
  const pixelRatio = Math.max(1, Math.round((options.pixelRatio ?? 1) * 4) / 4);
  const useSprites = options.sprites ?? true;

  for (const b of swarm.butterflies) {
    // Wings close toward the body and open again — a flutter, not a full beat.
    const step = Math.round(((((b.phase % TAU) + TAU) % TAU) / TAU) * FLAP_STEPS) % FLAP_STEPS;
    const size = Math.round(b.size);

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.tilt);

    const sp = useSprites ? sprite(size, step, pixelRatio) : null;
    if (sp) {
      ctx.drawImage(
        sp.image,
        -sp.hx / pixelRatio,
        -sp.hy / pixelRatio,
        sp.w / pixelRatio,
        sp.h / pixelRatio,
      );
    } else {
      drawVector(ctx, b.size, flapAt(step));
    }
    ctx.restore();
  }
}
