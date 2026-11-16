import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const SOURCES = { front: 'card-main', back: 'card-flip' };
const BUBBLE_SEARCH = { x: 0, y: 0, w: 40, h: 40 }; // bubble lives in the top-left; its inside is pure white

await mkdir('public/sprites/generated', { recursive: true });
const out = {};

for (const [side, name] of Object.entries(SOURCES)) {
  const input = `assets/${name}.gif`;
  const meta = await sharp(input, { animated: true }).metadata();
  const width = meta.width;
  const height = meta.pageHeight ?? meta.height;
  const frames = meta.pages ?? 1;
  const delays = meta.delay ?? Array(frames).fill(100);

  await sharp(input, { animated: true }).png().toFile(`public/sprites/generated/${name}-sheet.png`);

  // top edge of the white bubble interior, per frame
  const { data, info } = await sharp(input, { animated: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bubbleTop = [];
  for (let f = 0; f < frames; f++) {
    let top = Infinity;
    for (let y = BUBBLE_SEARCH.y; y < BUBBLE_SEARCH.y + BUBBLE_SEARCH.h; y++) {
      for (let x = BUBBLE_SEARCH.x; x < BUBBLE_SEARCH.x + BUBBLE_SEARCH.w; x++) {
        const i = ((f * height + y) * info.width + x) * 4;
        if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255 && data[i + 3] > 0) {
          top = Math.min(top, y);
        }
      }
    }
    bubbleTop.push(Number.isFinite(top) ? top : 0);
  }

  out[side] = {
    sheet: `/sprites/generated/${name}-sheet.png`,
    width,
    height,
    frames,
    delays,
    // vertical bob of the bubble relative to frame 0, in sprite pixels
    bubbleOffsets: bubbleTop.map((t) => t - bubbleTop[0]),
  };
}

await writeFile('src/data/sprites.generated.json', JSON.stringify(out, null, 2) + '\n');
console.log(
  '[sprites]',
  Object.values(out)
    .map((s) => `${s.sheet} (${s.frames} frames)`)
    .join(', '),
);
