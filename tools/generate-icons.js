// generate-icons.js - Genera iconos PNG para PWA con Node.js (sin dependencias externas)
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

function crc32(buf) {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeB = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeB, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData));
  return Buffer.concat([len, typeB, data, crc]);
}

function createIcon(size) {
  const bg = [15, 23, 42];    // #0f172a dark blue
  const accent = [59, 130, 246]; // #3b82f6 blue-500
  const white = [255, 255, 255];
  const rows = [];

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const innerR = size * 0.30;

  for (let y = 0; y < size; y++) {
    rows.push(0); // filter None
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let r, g, b, a = 255;

      if (dist <= outerR) {
        // Circle area
        if (dist <= innerR) {
          // Inner: white
          r = white[0]; g = white[1]; b = white[2];
          // Simple "S" letter hint: darker pixel patterns
          const angle = Math.atan2(dy, dx);
          const nx = (dx / innerR + 1) / 2;
          const ny = (dy / innerR + 1) / 2;
          if (ny > 0.3 && ny < 0.7 && nx > 0.25 && nx < 0.75) {
            const wave = Math.sin(nx * Math.PI * 4 + ny * Math.PI * 2) * 0.15;
            if (ny > 0.45 + wave && ny < 0.55 + wave) {
              r = accent[0]; g = accent[1]; b = accent[2];
            }
          }
        } else if (dist > innerR + 2) {
          // Outer ring: accent blue
          r = accent[0]; g = accent[1]; b = accent[2];
        } else {
          // Gradient edge
          const t = (dist - innerR) / 3;
          r = Math.round(white[0] + (accent[0] - white[0]) * t);
          g = Math.round(white[1] + (accent[1] - white[1]) * t);
          b = Math.round(white[2] + (accent[2] - white[2]) * t);
        }
      } else {
        // Background
        r = bg[0]; g = bg[1]; b = bg[2];
      }

      rows.push(r, g, b, a);
    }
  }

  const raw = Buffer.from(rows);
  const compressed = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);   // bit depth
  ihdr.writeUInt8(6, 9);   // color type RGBA
  ihdr.writeUInt8(0, 10);  // compression
  ihdr.writeUInt8(0, 11);  // filter
  ihdr.writeUInt8(0, 12);  // interlace

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'frontend', 'public');
for (const size of [192, 512]) {
  const png = createIcon(size);
  const filePath = path.join(outDir, `icon-${size}x${size}.png`);
  fs.writeFileSync(filePath, png);
  const stat = fs.statSync(filePath);
  console.log(`✅ icon-${size}x${size}.png (${stat.size} bytes)`);
}
