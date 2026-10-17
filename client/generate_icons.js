import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(size) {
  const width = size;
  const height = size;

  // Each scanline: filter byte (0) + width * 4 bytes RGBA
  const rawData = Buffer.alloc(height * (1 + width * 4));

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (1 + width * 4);
    rawData[rowOffset] = 0; // None filter

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Distance from center
      const cx = width / 2;
      const cy = height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const radius = width * 0.44;

      // Rounded rect / circle icon background
      const cornerRadius = width * 0.22;
      const inBoxX = Math.abs(dx) <= (width * 0.44 - cornerRadius);
      const inBoxY = Math.abs(dy) <= (height * 0.44 - cornerRadius);
      const cornerDist = Math.sqrt(
        Math.pow(Math.max(0, Math.abs(dx) - (width * 0.44 - cornerRadius)), 2) +
        Math.pow(Math.max(0, Math.abs(dy) - (height * 0.44 - cornerRadius)), 2)
      );

      const inIcon = inBoxX || inBoxY || cornerDist <= cornerRadius;

      if (!inIcon) {
        // Transparent
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Deep indigo / violet gradient background: #4f46e5 to #7c3aed
      const t = (x + y) / (width + height);
      let r = Math.round(79 + (124 - 79) * t);
      let g = Math.round(70 + (58 - 70) * t);
      let b = Math.round(229 + (237 - 229) * t);

      // Inner chat bubble symbol
      const inBubble = (Math.abs(dx) < width * 0.22 && Math.abs(dy + height * 0.03) < height * 0.18);
      const inTail = (dx < -width * 0.05 && dx > -width * 0.22 && dy > height * 0.12 && dy < height * 0.24 && (dx - dy < -width * 0.05));

      if (inBubble || inTail) {
        // White chat bubble
        r = 255;
        g = 255;
        b = 255;

        // Inner pulse dot / lock
        if (Math.abs(dx) < width * 0.06 && Math.abs(dy + height * 0.03) < height * 0.06) {
          r = 79;
          g = 70;
          b = 229;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = 255;
    }
  }

  // Compress with zlib
  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = createChunk('IDAT', deflated);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

// CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

const outDir = path.resolve('./public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(path.join(outDir, 'icon-192.png'), createPNG(192));
fs.writeFileSync(path.join(outDir, 'icon-512.png'), createPNG(512));
console.log('Successfully generated icon-192.png and icon-512.png');
