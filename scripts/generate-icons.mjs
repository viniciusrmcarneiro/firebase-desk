import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const buildDirectory = resolve(repositoryRoot, 'apps/desktop/build');

const crcTable = Array.from({ length: 256 }, (_, tableIndex) => {
  let checksum = tableIndex;
  for (let bitIndex = 0; bitIndex < 8; bitIndex += 1) {
    checksum = (checksum & 1) === 1 ? 0xedb88320 ^ (checksum >>> 1) : checksum >>> 1;
  }
  return checksum >>> 0;
});

function crc32(buffer) {
  let checksum = 0xffffffff;
  for (const byteValue of buffer) {
    checksum = crcTable[(checksum ^ byteValue) & 0xff] ^ (checksum >>> 8);
  }
  return (checksum ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const checksumBuffer = Buffer.alloc(4);
  checksumBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([lengthBuffer, typeBuffer, data, checksumBuffer]);
}

function mixChannel(start, end, amount) {
  return Math.round(start + (end - start) * amount);
}

function mixColor(start, end, amount) {
  return [
    mixChannel(start[0], end[0], amount),
    mixChannel(start[1], end[1], amount),
    mixChannel(start[2], end[2], amount),
    mixChannel(start[3] ?? 255, end[3] ?? 255, amount),
  ];
}

function isInsideRoundedRect(column, row, width, height, radius) {
  const radiusColumn = column < radius ? radius : column > width - radius ? width - radius : column;
  const radiusRow = row < radius ? radius : row > height - radius ? height - radius : row;
  const deltaColumn = column - radiusColumn;
  const deltaRow = row - radiusRow;
  return deltaColumn * deltaColumn + deltaRow * deltaRow <= radius * radius;
}

function blendPixel(rawPixels, size, column, row, color) {
  if (column < 0 || row < 0 || column >= size || row >= size) return;
  const pixelOffset = row * (1 + size * 4) + 1 + column * 4;
  const sourceAlpha = color[3] / 255;
  const targetAlpha = rawPixels[pixelOffset + 3] / 255;
  const outputAlpha = sourceAlpha + targetAlpha * (1 - sourceAlpha);

  if (outputAlpha === 0) {
    rawPixels[pixelOffset] = 0;
    rawPixels[pixelOffset + 1] = 0;
    rawPixels[pixelOffset + 2] = 0;
    rawPixels[pixelOffset + 3] = 0;
    return;
  }

  rawPixels[pixelOffset] = Math.round(
    (color[0] * sourceAlpha + rawPixels[pixelOffset] * targetAlpha * (1 - sourceAlpha))
      / outputAlpha,
  );
  rawPixels[pixelOffset + 1] = Math.round(
    (color[1] * sourceAlpha + rawPixels[pixelOffset + 1] * targetAlpha * (1 - sourceAlpha))
      / outputAlpha,
  );
  rawPixels[pixelOffset + 2] = Math.round(
    (color[2] * sourceAlpha + rawPixels[pixelOffset + 2] * targetAlpha * (1 - sourceAlpha))
      / outputAlpha,
  );
  rawPixels[pixelOffset + 3] = Math.round(outputAlpha * 255);
}

function paintRoundedRect(rawPixels, size, left, top, width, height, radius, color) {
  const startColumn = Math.max(0, Math.floor(left));
  const endColumn = Math.min(size, Math.ceil(left + width));
  const startRow = Math.max(0, Math.floor(top));
  const endRow = Math.min(size, Math.ceil(top + height));

  for (let row = startRow; row < endRow; row += 1) {
    for (let column = startColumn; column < endColumn; column += 1) {
      if (isInsideRoundedRect(column - left, row - top, width, height, radius)) {
        blendPixel(rawPixels, size, column, row, color);
      }
    }
  }
}

function createPng(size) {
  const rawPixels = Buffer.alloc(size * (1 + size * 4));
  const radius = Math.round(size * 0.19);
  const deepNavy = [9, 26, 45, 255];
  const teal = [20, 154, 167, 255];
  const amber = [249, 146, 62, 255];

  for (let row = 0; row < size; row += 1) {
    rawPixels[row * (1 + size * 4)] = 0;
    for (let column = 0; column < size; column += 1) {
      if (!isInsideRoundedRect(column, row, size - 1, size - 1, radius)) continue;
      const diagonalAmount = (column + row) / (2 * Math.max(1, size - 1));
      const verticalAmount = row / Math.max(1, size - 1);
      const baseColor = mixColor(deepNavy, teal, diagonalAmount * 0.75);
      const accentAmount = Math.max(0, (verticalAmount - 0.48) / 0.52) * 0.55;
      blendPixel(rawPixels, size, column, row, mixColor(baseColor, amber, accentAmount));
    }
  }

  paintRoundedRect(
    rawPixels,
    size,
    size * 0.18,
    size * 0.19,
    size * 0.64,
    size * 0.08,
    size * 0.03,
    [255, 255, 255, 225],
  );
  paintRoundedRect(
    rawPixels,
    size,
    size * 0.20,
    size * 0.34,
    size * 0.17,
    size * 0.26,
    size * 0.035,
    [92, 224, 230, 240],
  );
  paintRoundedRect(
    rawPixels,
    size,
    size * 0.415,
    size * 0.30,
    size * 0.17,
    size * 0.30,
    size * 0.035,
    [255, 255, 255, 245],
  );
  paintRoundedRect(
    rawPixels,
    size,
    size * 0.63,
    size * 0.39,
    size * 0.17,
    size * 0.21,
    size * 0.035,
    [255, 189, 89, 242],
  );
  paintRoundedRect(
    rawPixels,
    size,
    size * 0.18,
    size * 0.66,
    size * 0.64,
    size * 0.085,
    size * 0.035,
    [255, 255, 255, 230],
  );
  paintRoundedRect(
    rawPixels,
    size,
    size * 0.25,
    size * 0.74,
    size * 0.08,
    size * 0.17,
    size * 0.025,
    [255, 255, 255, 215],
  );
  paintRoundedRect(
    rawPixels,
    size,
    size * 0.67,
    size * 0.74,
    size * 0.08,
    size * 0.17,
    size * 0.025,
    [255, 255, 255, 215],
  );
  paintRoundedRect(
    rawPixels,
    size,
    size * 0.45,
    size * 0.75,
    size * 0.10,
    size * 0.09,
    size * 0.025,
    [9, 26, 45, 210],
  );

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    header,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', deflateSync(rawPixels, { level: 9 })),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

function createIco() {
  const iconSizes = [16, 24, 32, 48, 64, 128, 256];
  const pngImages = iconSizes.map((size) => ({ size, data: createPng(size) }));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngImages.length, 4);

  const entries = [];
  let imageOffset = header.length + pngImages.length * 16;
  for (const image of pngImages) {
    const entry = Buffer.alloc(16);
    entry[0] = image.size === 256 ? 0 : image.size;
    entry[1] = image.size === 256 ? 0 : image.size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(imageOffset, 12);
    entries.push(entry);
    imageOffset += image.data.length;
  }

  return Buffer.concat([header, ...entries, ...pngImages.map((image) => image.data)]);
}

function createIcns() {
  const entries = [
    { type: 'ic07', data: createPng(128) },
    { type: 'ic08', data: createPng(256) },
    { type: 'ic09', data: createPng(512) },
    { type: 'ic10', data: createPng(1024) },
  ];
  const totalLength = 8 + entries.reduce((sum, entry) => sum + 8 + entry.data.length, 0);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(totalLength, 4);
  const chunks = entries.map((entry) => {
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write(entry.type, 0, 4, 'ascii');
    chunkHeader.writeUInt32BE(entry.data.length + 8, 4);
    return Buffer.concat([chunkHeader, entry.data]);
  });
  return Buffer.concat([header, ...chunks]);
}

function createSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img" aria-label="Firebase Desk icon">
  <defs>
    <linearGradient id="bg" x1="120" x2="904" y1="96" y2="928" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#091a2d"/>
      <stop offset="0.58" stop-color="#149aa7"/>
      <stop offset="1" stop-color="#f9923e"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="196" fill="url(#bg)"/>
  <rect x="184" y="196" width="656" height="82" rx="32" fill="#fff" fill-opacity="0.9"/>
  <rect x="205" y="348" width="174" height="266" rx="36" fill="#5ce0e6"/>
  <rect x="425" y="307" width="174" height="307" rx="36" fill="#fff"/>
  <rect x="645" y="399" width="174" height="215" rx="36" fill="#ffbd59"/>
  <rect x="184" y="676" width="656" height="88" rx="36" fill="#fff" fill-opacity="0.92"/>
  <rect x="256" y="756" width="82" height="174" rx="26" fill="#fff" fill-opacity="0.86"/>
  <rect x="686" y="756" width="82" height="174" rx="26" fill="#fff" fill-opacity="0.86"/>
  <rect x="461" y="768" width="102" height="92" rx="26" fill="#091a2d" fill-opacity="0.82"/>
</svg>
`;
}

mkdirSync(buildDirectory, { recursive: true });
writeFileSync(resolve(buildDirectory, 'icon.svg'), createSvg());
writeFileSync(resolve(buildDirectory, 'icon.png'), createPng(1024));
writeFileSync(resolve(buildDirectory, 'icon.ico'), createIco());
writeFileSync(resolve(buildDirectory, 'icon.icns'), createIcns());

console.log(`Generated desktop icons in ${buildDirectory}`);
