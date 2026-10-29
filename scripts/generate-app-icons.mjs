import { createRequire } from 'node:module';
import { unlink, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';

const web = createRequire(resolve('apps/web/package.json'));
const next = createRequire(web.resolve('next/package.json'));
const sharp = next('sharp');

const MASTER = 'assets/brand/overtaek-mark.png';
const CANVAS = 1024;
const STORE_SAFE = 0.7;
const ADAPTIVE_SAFE = (66 / 108) / Math.SQRT2;
const NEAR_WHITE = 248;

async function save(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, data);
}

async function remove(path) {
  await unlink(path).catch((error) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

function inkBounds(data, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      if (data[i] > NEAR_WHITE && data[i + 1] > NEAR_WHITE && data[i + 2] > NEAR_WHITE) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const pad = 2;
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(width, maxX + pad + 1) - Math.max(0, minX - pad),
    height: Math.min(height, maxY + pad + 1) - Math.max(0, minY - pad),
  };
}

async function compose(canvas, safe, { monochrome = false } = {}) {
  const { data, info } = await sharp(MASTER).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const bounds = inkBounds(data, info.width, info.height);
  const longest = Math.max(bounds.width, bounds.height);
  const fitted = Math.round(canvas * safe);
  const scale = fitted / longest;
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  const resized = await sharp(MASTER)
    .extract(bounds)
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = resized.data;
  if (monochrome) {
    for (let i = 0; i < pixels.length; i += 4) {
      const white = pixels[i] > NEAR_WHITE && pixels[i + 1] > NEAR_WHITE && pixels[i + 2] > NEAR_WHITE;
      pixels[i] = 0;
      pixels[i + 1] = 0;
      pixels[i + 2] = 0;
      pixels[i + 3] = white ? 0 : 255;
    }
  }
  const left = Math.round((canvas - width) / 2);
  const top = Math.round((canvas - height) / 2);
  const base = monochrome
    ? { r: 0, g: 0, b: 0, alpha: 0 }
    : { r: 255, g: 255, b: 255, alpha: 1 };
  return sharp({ create: { width: canvas, height: canvas, channels: 4, background: base } })
    .composite([{ input: pixels, raw: { width, height, channels: 4 }, left, top }]);
}

async function png(image, { alpha }) {
  const rendered = alpha ? image.ensureAlpha() : image.flatten({ background: '#ffffff' }).removeAlpha();
  return rendered.png().toBuffer();
}

function pngInfo(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), colorType: buffer[25] };
}

const store = await png(await compose(CANVAS, STORE_SAFE), { alpha: false });
const adaptive = await png(await compose(CANVAS, ADAPTIVE_SAFE), { alpha: false });
const monochrome = await png(await compose(CANVAS, ADAPTIVE_SAFE, { monochrome: true }), { alpha: true });

async function sized(source, size, { alpha }) {
  let image = sharp(source).resize(size, size);
  image = alpha ? image.ensureAlpha() : image.flatten({ background: '#ffffff' }).removeAlpha();
  return image.png().toBuffer();
}

const sizes = [16, 32, 48, 64, 180, 192, 512, 1024];
for (const theme of ['white', 'black']) {
  await remove(`apps/web/public/icons/${theme}/icon.svg`);
  for (const size of sizes) await save(`apps/web/public/icons/${theme}/icon-${size}.png`, await sized(store, size, { alpha: false }));
  await save(`apps/web/public/icons/${theme}/maskable-512.png`, await sized(adaptive, 512, { alpha: false }));
}

await remove('assets/brand/overtaek-icon.svg');
await remove('assets/brand/overtaek-icon-black.svg');
await remove('apps/web/src/app/icon.svg');
await save('apps/web/src/app/icon.png', await sized(store, 512, { alpha: false }));
await save('apps/web/src/app/apple-icon.png', await sized(store, 180, { alpha: false }));
await save('apps/web/public/icons/icon-192.png', await sized(store, 192, { alpha: false }));
await save('apps/web/public/icons/icon-512.png', await sized(store, 512, { alpha: false }));
await save('apps/web/public/icons/maskable-512.png', await sized(adaptive, 512, { alpha: false }));
await save('apps/mobile/assets/icon.png', store);
await save('apps/mobile/assets/icon-black.png', store);
await save('apps/mobile/assets/favicon.png', await sized(store, 48, { alpha: false }));
await save('apps/mobile/assets/adaptive-icon.png', adaptive);
await save('apps/mobile/assets/adaptive-icon-black.png', adaptive);
await save('apps/mobile/assets/monochrome-icon.png', monochrome);

const play = await sized(store, 512, { alpha: true });
await save('docs/store/play-icon-512.png', play);

const icoSizes = [16, 32, 48];
const images = await Promise.all(icoSizes.map((size) => sized(store, size, { alpha: true })));
const header = Buffer.alloc(6 + 16 * icoSizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(icoSizes.length, 4);
let offset = header.length;
images.forEach((image, i) => {
  const pos = 6 + i * 16;
  header[pos] = header[pos + 1] = icoSizes[i];
  header.writeUInt16LE(1, pos + 4);
  header.writeUInt16LE(32, pos + 6);
  header.writeUInt32LE(image.length, pos + 8);
  header.writeUInt32LE(offset, pos + 12);
  offset += image.length;
});
await save('apps/web/src/app/favicon.ico', Buffer.concat([header, ...images]));

const iconInfo = pngInfo(store);
const playInfo = pngInfo(play);
if (iconInfo.width !== 1024 || iconInfo.height !== 1024 || iconInfo.colorType !== 2) {
  throw new Error(`iOS icon must be 1024 RGB, got ${JSON.stringify(iconInfo)}`);
}
if (playInfo.width !== 512 || playInfo.height !== 512 || playInfo.colorType !== 6 || play.length > 1024 * 1024) {
  throw new Error(`Play icon must be 512 32-bit PNG under 1 MB, got ${JSON.stringify(playInfo)} (${play.length} bytes)`);
}
console.log('Generated the arrowhead mark for web, Apple touch, Expo, Android launchers, and the Play listing icon.');
console.log('Lane capsules stay in packages/shared/src/polished-identity.ts.');
