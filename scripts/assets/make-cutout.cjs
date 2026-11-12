#!/usr/bin/env node
/**
 * Removes a plain studio backdrop from a photo and writes a PNG with transparency.
 * The subject's pixels are never altered — only backdrop pixels become transparent (with a soft 1–2px edge).
 *
 * How: region-growing from the image border. A pixel joins the "backdrop" region when it is light, almost
 * colourless (studio grey/white) AND changes only gradually from the neighbour it was reached from. Dark suits,
 * hair, skin and saturated colours stop the growth; light areas enclosed by the subject (e.g. a white shirt)
 * are never reached because they are not connected to the backdrop.
 *
 * Usage:
 *   node scripts/assets/make-cutout.cjs <in.png> <out.png> [--crop l,t,w,h] [--minLum 110] [--maxSat 30] [--step 16]
 */
const path = require('node:path');
const sharp = require(require.resolve('sharp', { paths: [path.resolve(__dirname, '../../apps/api')] }));

const args = process.argv.slice(2);
const [input, output] = args;
if (!input || !output) {
  console.error('usage: make-cutout.cjs <in> <out> [--crop l,t,w,h] [--minLum n] [--maxSat n] [--step n]');
  process.exit(1);
}
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const MIN_LUM = Number(opt('minLum', 110));
const MAX_SAT = Number(opt('maxSat', 30));
const STEP = Number(opt('step', 16)); // max colour change between neighbouring backdrop pixels
const crop = opt('crop', null);

(async () => {
  let img = sharp(input).removeAlpha();
  if (crop) {
    const [left, top, width, height] = crop.split(',').map(Number);
    img = img.extract({ left, top, width, height });
  }
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const N = W * H;
  const lum = (i) => 0.299 * data[i * 3] + 0.587 * data[i * 3 + 1] + 0.114 * data[i * 3 + 2];
  const sat = (i) => Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) - Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]);
  const isBackdropColour = (i) => lum(i) >= MIN_LUM && sat(i) <= MAX_SAT;
  const diff = (a, b) =>
    Math.max(Math.abs(data[a * 3] - data[b * 3]), Math.abs(data[a * 3 + 1] - data[b * 3 + 1]), Math.abs(data[a * 3 + 2] - data[b * 3 + 2]));

  const bg = new Uint8Array(N);
  const queue = new Int32Array(N);
  let head = 0;
  let tail = 0;
  const seed = (i) => {
    if (!bg[i] && isBackdropColour(i)) {
      bg[i] = 1;
      queue[tail++] = i;
    }
  };
  for (let x = 0; x < W; x++) {
    seed(x);
    seed((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    seed(y * W);
    seed(y * W + W - 1);
  }
  while (head < tail) {
    const i = queue[head++];
    const x = i % W;
    const y = (i - x) / W;
    const visit = (j) => {
      if (!bg[j] && isBackdropColour(j) && diff(i, j) <= STEP) {
        bg[j] = 1;
        queue[tail++] = j;
      }
    };
    if (x > 0) visit(i - 1);
    if (x < W - 1) visit(i + 1);
    if (y > 0) visit(i - W);
    if (y < H - 1) visit(i + W);
  }

  // Alpha mask: subject = 255, backdrop = 0. Close tiny holes in the backdrop (isolated subject-coloured
  // specks) by requiring a subject pixel to have at least 2 subject neighbours.
  const alpha = Buffer.alloc(N);
  for (let i = 0; i < N; i++) alpha[i] = bg[i] ? 0 : 255;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (!alpha[i]) continue;
      const n = (alpha[i - 1] ? 1 : 0) + (alpha[i + 1] ? 1 : 0) + (alpha[i - W] ? 1 : 0) + (alpha[i + W] ? 1 : 0);
      if (n < 2) alpha[i] = 0;
    }
  }
  // Soft, anti-aliased edge: 3×3 average of the mask. Interior pixels (all neighbours opaque) stay 255,
  // backdrop pixels far from the subject stay 0 — only the 1px boundary is softened.
  const soft = Buffer.alloc(N);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy < 0 || yy >= H || xx < 0 || xx >= W) continue;
          sum += alpha[yy * W + xx];
          count++;
        }
      }
      soft[y * W + x] = Math.round(sum / count);
    }
  }
  const rgba = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    rgba[i * 4] = data[i * 3];
    rgba[i * 4 + 1] = data[i * 3 + 1];
    rgba[i * 4 + 2] = data[i * 3 + 2];
    rgba[i * 4 + 3] = soft[i];
  }
  await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).png({ compressionLevel: 9 }).toFile(output);
  const removed = bg.reduce((s, v) => s + v, 0);
  console.log(`${path.basename(output)}: ${W}x${H}, backdrop removed ${(100 * removed / N).toFixed(1)}%`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
