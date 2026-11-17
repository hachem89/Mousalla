// Draws the PNG app icons from public/icon.svg (a 16x16 grid of <rect>s).
// Usage: node scripts/icons.js
import fs from 'node:fs';
import zlib from 'node:zlib';

const svg = fs.readFileSync('public/icon.svg', 'utf8');
const BACKGROUND = [0xf6, 0xef, 0xdc];

// [[r, g, b], x, y, w, h] for every rect, with the colour of its <g>.
const rects = [];
for (const group of svg.matchAll(/<g fill="#([0-9a-f]{6})">([\s\S]*?)<\/g>/g)) {
  const rgb = [0, 2, 4].map((i) => parseInt(group[1].slice(i, i + 2), 16));
  for (const r of group[2].matchAll(/x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)) {
    rects.push([rgb, ...r.slice(1).map(Number)]);
  }
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

// The 16px drawing fills about 56% of the icon, so it stays inside the
// safe zone when the phone crops the icon to a circle.
function png(size) {
  const scale = Math.floor((size * 0.56) / 16);
  const offset = Math.floor((size - 16 * scale) / 2);
  const pixels = Array.from({ length: size }, () => Array.from({ length: size }, () => BACKGROUND));
  for (const [rgb, x, y, w, h] of rects) {
    for (let py = (y * scale) + offset; py < ((y + h) * scale) + offset; py++) {
      for (let px = (x * scale) + offset; px < ((x + w) * scale) + offset; px++) pixels[py][px] = rgb;
    }
  }
  const raw = Buffer.concat(pixels.map((row) => Buffer.from([0, ...row.flat()])));
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512]) {
  fs.writeFileSync(`public/icon-${size}.png`, png(size));
  console.log(`public/icon-${size}.png`);
}
