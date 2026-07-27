// generate-icons.js - Genera iconos PNG para PWA con Node.js (sin dependencias externas)
// Estilo: fondo #0f172a, círculo blanco, marco amarillo #f59e0b, texto "SICAD"
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
  const bg = [15, 23, 42];        // #0f172a dark slate
  const yellow = [245, 158, 11];  // #f59e0b amber-500
  const white = [255, 255, 255];
  const rows = [];

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const innerR = size * 0.32;

  for (let y = 0; y < size; y++) {
    rows.push(0);
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let r, g, b, a = 255;

      // Yellow QR corner brackets
      const cornerSize = size * 0.18;
      const cornerThick = size * 0.04;
      const isCorner = (
        (Math.abs(dx + outerR * 0.75) < cornerSize && Math.abs(dy + outerR * 0.75) < cornerThick) ||
        (Math.abs(dx - outerR * 0.75) < cornerSize && Math.abs(dy + outerR * 0.75) < cornerThick) ||
        (Math.abs(dx + outerR * 0.75) < cornerThick && Math.abs(dy + outerR * 0.75) < cornerSize) ||
        (Math.abs(dx - outerR * 0.75) < cornerThick && Math.abs(dy + outerR * 0.75) < cornerSize) ||
        (Math.abs(dx + outerR * 0.75) < cornerSize && Math.abs(dy - outerR * 0.75) < cornerThick) ||
        (Math.abs(dx - outerR * 0.75) < cornerSize && Math.abs(dy - outerR * 0.75) < cornerThick) ||
        (Math.abs(dx + outerR * 0.75) < cornerThick && Math.abs(dy - outerR * 0.75) < cornerSize) ||
        (Math.abs(dx - outerR * 0.75) < cornerThick && Math.abs(dy - outerR * 0.75) < cornerSize)
      );

      if (dist <= outerR) {
        // Main circle area
        if (dist <= innerR) {
          // Inner white circle
          r = white[0]; g = white[1]; b = white[2];
          // Draw "SICAD" letter patterns as pixel blocks
          const nx = dx / innerR;
          const ny = dy / innerR;
          // "S" shape: top curve, diagonal, bottom curve
          const sTop = ny < -0.25 && nx > -0.6 && nx < 0.6 && ny > -0.55;
          const sMid = Math.abs(ny) < 0.1 && nx > 0.3 && nx < 0.6;
          const sBot = ny > 0.25 && nx > -0.6 && nx < 0.6 && ny < 0.55;
          const sVert = nx > 0.5 && nx < 0.65 && ny < -0.2 && ny > -0.55;
          const sVert2 = nx > -0.65 && nx < -0.5 && ny > 0.2 && ny < 0.55;
          if (sTop || sMid || sBot || sVert || sVert2) {
            r = yellow[0]; g = yellow[1]; b = yellow[2];
          }
          // Yellow dot accent
          if (Math.abs(nx - 0.6) < 0.08 && Math.abs(ny + 0.5) < 0.08) {
            r = yellow[0]; g = yellow[1]; b = yellow[2];
          }
          if (Math.abs(nx + 0.6) < 0.08 && Math.abs(ny - 0.5) < 0.08) {
            r = yellow[0]; g = yellow[1]; b = yellow[2];
          }
        } else if (dist > innerR + 3) {
          // Ring area
          if (isCorner) {
            r = yellow[0]; g = yellow[1]; b = yellow[2];
          } else {
            r = white[0]; g = white[1]; b = white[2];
          }
        } else {
          // Gradient transition
          const t = (dist - innerR) / 4;
          r = Math.round(white[0] + (white[0] - white[0]) * t);
          g = Math.round(white[1] + (white[1] - white[1]) * t);
          b = Math.round(white[2] + (white[2] - white[2]) * t);
        }
      } else {
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
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);

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
