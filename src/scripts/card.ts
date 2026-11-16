import { createHolo, type HoloFace } from './holo';

const W = 128;
const H = 72;
const MAX_TILT = 10; // degrees
const SIZE = 0.5; // card size as a share of the largest size that fits the screen
const MIN_WIDTH = 320; // CSS px; small screens use up to the full width instead

type Side = 'front' | 'back';

interface FaceRefs extends HoloFace {
  el: HTMLElement;
}

export function initCard(scene: HTMLElement) {
  const holoStrength = clamp(Number(scene.dataset.holo ?? 0.6), 0, 1);
  const holo = createHolo(W, H, holoStrength);
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  const faces = {} as Record<Side, FaceRefs>;
  for (const side of ['front', 'back'] as Side[]) {
    const el = scene.querySelector<HTMLElement>(`[data-face="${side}"]`)!;
    const canvas = el.querySelector<HTMLCanvasElement>('.face__holo')!;
    faces[side] = {
      el,
      art: el.querySelector<HTMLImageElement>('.face__art img')!, // sprite strip; frame 0 on top
      ctx: canvas.getContext('2d'),
      mask: null,
    };
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const header = document.querySelector('.site-header')?.getBoundingClientRect().height ?? 64;
    const vw = Math.min(window.innerWidth, document.documentElement.clientWidth);
    const maxW = Math.min(vw * 0.92, 1280);
    const maxH = window.innerHeight - header - 100; // room for the footer
    const fit = Math.min(maxW / W, maxH / H);
    const scale = Math.min(fit, Math.max(fit * SIZE, MIN_WIDTH / W));
    const devicePx = Math.max(1, Math.floor(scale * dpr));
    const u = devicePx / dpr;

    const snap = (target: number, step: number) =>
      Math.max(12, Math.round((Math.max(target, 11) * dpr) / step) * step) / dpr;

    for (const el of [scene, scene.parentElement]) {
      el?.style.setProperty('--u', `${u}px`);
      el?.style.setProperty('--fs-link', `${snap(u * 4.5, 6)}px`);
    }
    scene.parentElement?.style.setProperty('--fs-small', `${snap(u * 3.5, 6)}px`);
  }

  resize();
  window.addEventListener('resize', resize);

  let flipped = false;

  function setFlipped(next: boolean) {
    flipped = next;
    scene.toggleAttribute('data-flipped', next);
    faces.front.el.inert = next;
    faces.back.el.inert = !next;
    document.documentElement.dataset.side = next ? 'back' : 'front';
    // hide the shine while the card turns over
    target.glow = 0;
    holo.clear(Object.values(faces));
    kick();
  }

  for (const side of ['front', 'back'] as Side[]) {
    faces[side].el.querySelector('[data-card-flip]')?.addEventListener('click', () => {
      setFlipped(side === 'front');
      faces[side === 'front' ? 'back' : 'front'].el
        .querySelector<HTMLButtonElement>('[data-card-flip]')
        ?.focus({ preventScroll: true });
    });
  }

  const target = { rx: 0, ry: 0, mx: W / 2, my: H / 2, glow: 0 };
  const cur = { ...target };

  const DRAG_THRESHOLD = 6; // px of movement before a press becomes a drag
  const behind = scene.parentElement?.querySelector<HTMLElement>('[data-behind-card]');
  const offset = { x: 0, y: 0 };
  let drag: {
    id: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    lastX: number;
    lastY: number;
    active: boolean;
  } | null = null;
  let suppressClick = false;

  /** Move the card, keeping it fully inside the window and on whole device pixels. */
  function setOffset(x: number, y: number) {
    const dpr = window.devicePixelRatio || 1;
    const r = scene.getBoundingClientRect();
    const left = r.left - offset.x;
    const top = r.top - offset.y;
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    offset.x = Math.round(clamp(x, -left, Math.max(-left, vw - r.width - left)) * dpr) / dpr;
    offset.y = Math.round(clamp(y, -top, Math.max(-top, vh - r.height - top)) * dpr) / dpr;
    scene.style.translate = `${offset.x}px ${offset.y}px`;

    if (behind) {
      const c = scene.getBoundingClientRect();
      const b = behind.getBoundingClientRect();
      behind.inert = c.left < b.right && c.right > b.left && c.top < b.bottom && c.bottom > b.top;
    }
  }

  window.addEventListener('resize', () => setOffset(offset.x, offset.y));

  // stop the browser's own link/image dragging
  scene.addEventListener('dragstart', (e) => e.preventDefault());

  scene.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    suppressClick = false;
    drag = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
      lastX: e.clientX,
      lastY: e.clientY,
      active: false,
    };
  });

  scene.addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (!drag.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        drag.active = true;
        scene.setPointerCapture(e.pointerId);
        scene.toggleAttribute('data-dragging', true);
      }
      if (drag.active) {
        setOffset(drag.baseX + dx, drag.baseY + dy);
        // swing: tilt in the direction of travel, eased back in frame()
        target.ry = clamp(target.ry + (e.clientX - drag.lastX) * 0.6, -MAX_TILT * 1.5, MAX_TILT * 1.5);
        target.rx = clamp(target.rx - (e.clientY - drag.lastY) * 0.6, -MAX_TILT * 1.5, MAX_TILT * 1.5);
        drag.lastX = e.clientX;
        drag.lastY = e.clientY;
        target.glow = 1;
        kick();
        return;
      }
    }

    const r = scene.getBoundingClientRect();
    const nx = clamp((e.clientX - r.left) / r.width, 0, 1);
    const ny = clamp((e.clientY - r.top) / r.height, 0, 1);
    target.ry = (nx - 0.5) * 2 * MAX_TILT;
    target.rx = -(ny - 0.5) * 2 * MAX_TILT;
    target.mx = nx * W;
    target.my = ny * H;
    target.glow = 1;
    kick();
  });

  const release = () => {
    target.rx = target.ry = 0;
    target.glow = 0;
    kick();
  };

  const endDrag = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.active) {
      suppressClick = true; // the click that follows a drag must not flip or open a link
      scene.toggleAttribute('data-dragging', false);
      if (scene.hasPointerCapture(e.pointerId)) scene.releasePointerCapture(e.pointerId);
    }
    drag = null;
  };

  scene.addEventListener('pointerup', (e) => {
    endDrag(e);
    if (e.pointerType !== 'mouse') release();
  });
  scene.addEventListener('pointercancel', (e) => {
    endDrag(e);
    release();
  });
  scene.addEventListener('pointerleave', () => {
    if (!drag?.active) release();
  });

  // capture phase: swallow the click after a drag before links/buttons see it
  scene.addEventListener(
    'click',
    (e) => {
      if (!suppressClick) return;
      suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
    },
    true,
  );

  scene.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a, button')) return;
    setFlipped(!flipped);
  });

  let raf = 0;

  function kick() {
    if (!raf) raf = requestAnimationFrame(frame);
  }

  function frame() {
    raf = 0;
    const still = reduceMotion.matches;
    const k = 0.16;
    let moving = false;
    for (const key of ['rx', 'ry', 'mx', 'my', 'glow'] as const) {
      const goal = still && key !== 'mx' && key !== 'my' ? 0 : target[key];
      const d = goal - cur[key];
      if (Math.abs(d) > 0.01) {
        cur[key] += d * k;
        moving = true;
      } else {
        cur[key] = goal;
      }
    }

    scene.style.setProperty('--rx', `${cur.rx.toFixed(2)}deg`);
    scene.style.setProperty('--ry', `${cur.ry.toFixed(2)}deg`);

    if (holoStrength > 0 && !still) {
      const side = flipped ? 'back' : 'front';
      holo.draw(faces[side], cur, side);
    }
    if (drag?.active && (target.rx || target.ry)) {
      // let the drag swing settle while the pointer holds still
      target.rx = Math.abs(target.rx) < 0.05 ? 0 : target.rx * 0.88;
      target.ry = Math.abs(target.ry) < 0.05 ? 0 : target.ry * 0.88;
      moving = true;
    }
    if (moving) kick();
  }
}

function clamp(v: number, lo: number, hi: number) {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}
