// Dithered holo shine drawn at sprite resolution, then upscaled with `image-rendering: pixelated`.

// 4×4 Bayer matrix, normalised to thresholds in (0, 1)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export interface HoloFace {
  art: HTMLImageElement;
  ctx: CanvasRenderingContext2D | null;
  mask: Uint8Array | null; // 1 = opaque sprite pixel
}

export interface Light {
  mx: number;
  my: number;
  glow: number;
}

export function createHolo(W: number, H: number, strength: number) {
  let lastDrawn = '';

  function buildMask(face: HoloFace) {
    if (face.mask || !face.art.complete || !face.art.naturalWidth) return;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return;
    g.drawImage(face.art, 0, 0, W, H, 0, 0, W, H); // first frame of the strip
    const px = g.getImageData(0, 0, W, H).data;
    const mask = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) mask[i] = px[i * 4 + 3] > 0 ? 1 : 0;
    face.mask = mask;
  }

  function clear(faces: HoloFace[]) {
    for (const f of faces) f.ctx?.clearRect(0, 0, W, H);
    lastDrawn = '';
  }

  function draw(face: HoloFace, light: Light, side: string) {
    const ctx = face.ctx;
    if (!ctx) return;
    buildMask(face);

    // snap the light source to the sprite grid => it moves in pixel steps
    const mx = Math.round(light.mx);
    const my = Math.round(light.my);
    const glow = Math.round(light.glow * 20) / 20;
    const key = `${mx},${my},${glow},${side}`;
    if (key === lastDrawn) return;
    lastDrawn = key;

    if (glow <= 0) {
      ctx.clearRect(0, 0, W, H);
      return;
    }

    const img = ctx.createImageData(W, H);
    const d = img.data;
    const mask = face.mask;
    const hueBase = (mx / W) * 160 + (my / H) * 80;
    const s = strength * glow;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const p = y * W + x;
        if (mask && !mask[p]) continue;
        const t = BAYER[(y & 3) * 4 + (x & 3)];
        const dist = Math.hypot((x - mx) / W, (y - my) / W);
        const o = p * 4;

        // 1. glare: dithered light spot under the pointer
        const glare = Math.max(0, 1 - dist / 0.16) ** 1.6 * glow;
        if (glare * 0.7 > t) {
          d[o] = 255;
          d[o + 1] = 255;
          d[o + 2] = 255;
          d[o + 3] = 130;
          continue;
        }

        // 2. foil: diagonal rainbow bands that slide with the light
        const band = 0.5 + 0.5 * Math.sin((x * 0.8 + y * 1.5 - mx * 1.1 - my * 0.6) * 0.16);
        // weaker over the text area so it stays readable
        const inText = x >= 56 && x <= 122 && y >= 6 && y <= 66 ? 0.45 : 1;
        const foil = band ** 2 * Math.max(0, 1 - dist / 0.42) * s * inText;
        if (foil * 0.6 > t) {
          const [r, g, b] = hsl((hueBase + x * 2.2 + y * 1.4) % 360, 0.9, 0.72);
          d[o] = r;
          d[o + 1] = g;
          d[o + 2] = b;
          d[o + 3] = 90 + 70 * s;
          continue;
        }

        // 3. sparkles: fixed pixels that twinkle as the light moves
        const h = hash(x, y);
        if (h < 0.012) {
          const tw = Math.sin(h * 900 + mx * 0.35 + my * 0.5);
          if (tw > 0.55 && dist < 0.6) {
            const [r, g, b] = hsl((hueBase + h * 3e4) % 360, 0.85, 0.75);
            d[o] = r;
            d[o + 1] = g;
            d[o + 2] = b;
            d[o + 3] = 255 * glow;
            continue;
          }
        }

        // 4. shade: far side of the card dims slightly => depth
        const shade = Math.max(0, dist - 0.5) * 0.8 * glow;
        if (shade > t) {
          d[o] = 97;
          d[o + 1] = 88;
          d[o + 2] = 82;
          d[o + 3] = 20;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  return { clear, draw };
}

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function hsl(h: number, s: number, l: number): [number, number, number] {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}
