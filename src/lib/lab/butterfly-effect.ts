import { BUTTERFLY_VIEWBOX, WING_HINGE } from '~/lib/butterflies/shape';

interface Bug {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Home slot in the formation, CSS px. */
  hx: number;
  hy: number;
  /** Where it heads while set free. */
  wx: number;
  wy: number;
  size: number;
  phase: number;
  flapHz: number;
  tilt: number;
  /** Seconds after start before it takes off. */
  delay: number;
  wobble: number;
}

const TAU = Math.PI * 2;
const SPRING = 16;
const DAMPING = 6.5;
const REPEL_RADIUS = 70;
const PICK_RADIUS = 26;
const FLAP_MIN = 0.74;
const SPRITE_WIDTH = 128;

function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The logo butterfly, rasterised once; both wings hinge on one line, so a flap is a horizontal squeeze. */
function loadSprite(src: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = SPRITE_WIDTH;
      canvas.height = Math.ceil((SPRITE_WIDTH * BUTTERFLY_VIEWBOX.height) / BUTTERFLY_VIEWBOX.width);
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas);
    };
    image.onerror = reject;
    image.src = src;
  });
}

function drawBug(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  bug: Pick<Bug, 'x' | 'y' | 'size' | 'phase' | 'tilt'>,
): void {
  const flap = 1 - (1 - FLAP_MIN) * (0.5 - 0.5 * Math.cos(bug.phase));
  const scale = bug.size / BUTTERFLY_VIEWBOX.width;
  ctx.save();
  ctx.translate(bug.x, bug.y);
  ctx.rotate(bug.tilt);
  ctx.scale(flap, 1);
  ctx.drawImage(
    sprite,
    -WING_HINGE.x * scale,
    -WING_HINGE.y * scale,
    bug.size,
    BUTTERFLY_VIEWBOX.height * scale,
  );
  ctx.restore();
}

export function initButterflyEffect(root: HTMLElement): void {
  const canvas = root.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  const facts = Array.from(root.querySelectorAll<HTMLElement>('[data-fact]'));
  const nextButton = root.querySelector<HTMLButtonElement>('[data-next]');
  const freeButton = root.querySelector<HTMLButtonElement>('[data-free]');
  const count = Number(root.dataset.count) || 0;
  const spriteSrc = root.dataset.sprite;
  if (!canvas || !ctx || count === 0 || !spriteSrc) return;

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = random(2007);
  const bugs: Bug[] = Array.from({ length: count }, (_, i) => ({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    hx: 0,
    hy: 0,
    wx: 0,
    wy: 0,
    size: 20,
    phase: rand() * TAU,
    flapHz: 2.4 + rand() * 1.4,
    tilt: 0,
    delay: (i / count) * 1.6 + rand() * 0.4,
    wobble: rand() * TAU,
  }));

  let sprite: HTMLCanvasElement | null = null;
  let width = 0;
  let height = 0;
  let ratio = 1;
  let free = false;
  let picked = -1;
  let factIndex = facts.length > 1 ? 1 : 0;
  let pointer: { x: number; y: number } | null = null;
  let clock = 0;
  let frame = 0;
  let last = 0;
  let visible = false;
  let placed = false;

  const draw = () => {
    if (!sprite) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, width, height);
    bugs.forEach((bug, i) => {
      if (i === picked) return;
      const bob = still ? 0 : Math.sin(clock * 1.3 + bug.wobble) * 1.5;
      drawBug(ctx, sprite!, { ...bug, y: bug.y + bob });
    });
    const chosen = bugs[picked];
    if (chosen) {
      ctx.fillStyle = 'rgb(9 98 183 / 0.14)';
      ctx.beginPath();
      ctx.arc(chosen.x, chosen.y, chosen.size * 1.4, 0, TAU);
      ctx.fill();
      drawBug(ctx, sprite, { ...chosen, size: chosen.size * 2 });
    }
  };

  const layout = () => {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    ratio = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const cell = Math.sqrt((width * height) / count);
    const cols = Math.max(1, Math.floor(width / cell));
    const rows = Math.ceil(count / cols);
    const cw = width / cols;
    const ch = height / rows;
    const size = Math.max(12, Math.min(28, Math.min(cw, ch) * 0.78));
    bugs.forEach((bug, i) => {
      const jitter = random(i + 1);
      bug.hx = (i % cols) * cw + cw / 2 + (jitter() - 0.5) * cw * 0.3;
      bug.hy = Math.floor(i / cols) * ch + ch / 2 + (jitter() - 0.5) * ch * 0.3;
      bug.size = size * (0.85 + jitter() * 0.3);
      if (!placed) {
        bug.x = still ? bug.hx : rand() * width;
        bug.y = still ? bug.hy : height + 40 + rand() * 120;
      }
    });
    placed = true;
    draw();
  };

  const wander = (bug: Bug) => {
    bug.wx = 20 + rand() * Math.max(1, width - 40);
    bug.wy = 20 + rand() * Math.max(1, height - 40);
  };

  const pick = (index: number) => {
    picked = index;
    facts.forEach((fact, i) => fact.classList.toggle('is-current', i === factIndex));
    factIndex = (factIndex + 1) % Math.max(1, facts.length);
    if (still) draw();
  };

  const step = (dt: number) => {
    clock += dt;
    for (const bug of bugs) {
      if (clock < bug.delay) continue;
      if (free && Math.hypot(bug.wx - bug.x, bug.wy - bug.y) < 30) wander(bug);
      const pull = free ? SPRING * 0.15 : SPRING;
      let ax = ((free ? bug.wx : bug.hx) - bug.x) * pull - bug.vx * DAMPING;
      let ay = ((free ? bug.wy : bug.hy) - bug.y) * pull - bug.vy * DAMPING;
      if (pointer) {
        const dx = bug.x - pointer.x;
        const dy = bug.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < REPEL_RADIUS) {
          const push = (1 - dist / REPEL_RADIUS) * 2600;
          ax += (dx / dist) * push;
          ay += (dy / dist) * push;
        }
      }
      bug.vx += ax * dt;
      bug.vy += ay * dt;
      bug.x += bug.vx * dt;
      bug.y += bug.vy * dt;
      bug.tilt = Math.max(-0.5, Math.min(0.5, bug.vx / 500));
      bug.phase += dt * TAU * bug.flapHz * (1 + Math.min(Math.hypot(bug.vx, bug.vy) / 160, 2));
    }
  };

  const tick = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    step(dt);
    draw();
    frame = visible && !still ? requestAnimationFrame(tick) : 0;
  };

  const start = () => {
    if (still || frame || !visible || !sprite || document.hidden) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  const toCanvas = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  canvas.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') pointer = toCanvas(event);
  });
  canvas.addEventListener('pointerleave', () => {
    pointer = null;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const at = toCanvas(event);
    let best = -1;
    let bestDist = PICK_RADIUS;
    bugs.forEach((bug, i) => {
      const dist = Math.hypot(bug.x - at.x, bug.y - at.y);
      if (dist < bestDist) {
        best = i;
        bestDist = dist;
      }
    });
    if (best >= 0) pick(best);
  });
  nextButton?.addEventListener('click', () => pick(Math.floor(rand() * count)));
  freeButton?.addEventListener('click', () => {
    free = !free;
    freeButton.setAttribute('aria-pressed', String(free));
    const label = free ? freeButton.dataset.on : freeButton.dataset.off;
    if (label) freeButton.textContent = label;
    if (free) bugs.forEach(wander);
    if (still) {
      bugs.forEach((bug) => {
        bug.x = free ? bug.wx : bug.hx;
        bug.y = free ? bug.wy : bug.hy;
      });
      draw();
    }
  });

  loadSprite(spriteSrc)
    .then((loaded) => {
      sprite = loaded;
      root.dataset.enhanced = '';
      new ResizeObserver(layout).observe(canvas);
      new IntersectionObserver(([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible) start();
      }).observe(canvas);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) start();
      });
    })
    .catch(() => {});
}
