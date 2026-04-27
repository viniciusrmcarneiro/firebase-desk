import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const buildDirectory = resolve(repositoryRoot, 'apps/desktop/build');
const rendererAssetDirectory = resolve(repositoryRoot, 'apps/desktop/src/renderer/assets');
const sourcePngPath = resolve(buildDirectory, 'icon-source.png');
const sourceSvgPath = resolve(buildDirectory, 'icon-source.svg');
const sourceSplashPath = resolve(buildDirectory, 'splash-source.png');
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

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

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);

  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function unfilterScanline(filterType, encodedScanline, previousScanline, bytesPerPixel) {
  const scanline = Buffer.alloc(encodedScanline.length);

  for (let byteIndex = 0; byteIndex < encodedScanline.length; byteIndex += 1) {
    const left = byteIndex >= bytesPerPixel ? scanline[byteIndex - bytesPerPixel] : 0;
    const above = previousScanline[byteIndex] ?? 0;
    const upperLeft = byteIndex >= bytesPerPixel ? previousScanline[byteIndex - bytesPerPixel] : 0;
    const encodedValue = encodedScanline[byteIndex];
    let predictedValue = 0;

    if (filterType === 1) predictedValue = left;
    else if (filterType === 2) predictedValue = above;
    else if (filterType === 3) predictedValue = Math.floor((left + above) / 2);
    else if (filterType === 4) predictedValue = paethPredictor(left, above, upperLeft);
    else if (filterType !== 0) throw new Error(`Unsupported PNG filter type ${filterType}`);

    scanline[byteIndex] = (encodedValue + predictedValue) & 0xff;
  }

  return scanline;
}

function parsePng(buffer) {
  if (!buffer.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error(`${sourcePngPath} is not a PNG file`);
  }

  let readOffset = pngSignature.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const imageDataChunks = [];

  while (readOffset < buffer.length) {
    const chunkLength = buffer.readUInt32BE(readOffset);
    readOffset += 4;
    const chunkType = buffer.toString('ascii', readOffset, readOffset + 4);
    readOffset += 4;
    const chunkData = buffer.subarray(readOffset, readOffset + chunkLength);
    readOffset += chunkLength + 4;

    if (chunkType === 'IHDR') {
      width = chunkData.readUInt32BE(0);
      height = chunkData.readUInt32BE(4);
      bitDepth = chunkData[8];
      colorType = chunkData[9];
      const compressionMethod = chunkData[10];
      const filterMethod = chunkData[11];
      const interlaceMethod = chunkData[12];

      if (compressionMethod !== 0 || filterMethod !== 0 || interlaceMethod !== 0) {
        throw new Error('Unsupported PNG compression, filter, or interlace method');
      }
    } else if (chunkType === 'IDAT') {
      imageDataChunks.push(chunkData);
    } else if (chunkType === 'IEND') {
      break;
    }
  }

  if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
    throw new Error('Only 8-bit RGB/RGBA source PNGs are supported');
  }

  const channels = colorType === 6 ? 4 : 3;
  const scanlineLength = width * channels;
  const inflatedImageData = inflateSync(Buffer.concat(imageDataChunks));
  const pixels = Buffer.alloc(width * height * 4);
  let dataOffset = 0;
  let previousScanline = Buffer.alloc(scanlineLength);

  for (let rowIndex = 0; rowIndex < height; rowIndex += 1) {
    const filterType = inflatedImageData[dataOffset];
    dataOffset += 1;
    const encodedScanline = inflatedImageData.subarray(dataOffset, dataOffset + scanlineLength);
    dataOffset += scanlineLength;
    const scanline = unfilterScanline(filterType, encodedScanline, previousScanline, channels);

    for (let columnIndex = 0; columnIndex < width; columnIndex += 1) {
      const sourceOffset = columnIndex * channels;
      const targetOffset = (rowIndex * width + columnIndex) * 4;
      pixels[targetOffset] = scanline[sourceOffset];
      pixels[targetOffset + 1] = scanline[sourceOffset + 1];
      pixels[targetOffset + 2] = scanline[sourceOffset + 2];
      pixels[targetOffset + 3] = channels === 4 ? scanline[sourceOffset + 3] : 255;
    }

    previousScanline = scanline;
  }

  return { width, height, pixels };
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function pixelChannel(image, columnIndex, rowIndex, channelIndex) {
  return image.pixels[(rowIndex * image.width + columnIndex) * 4 + channelIndex];
}

function resizeImage(image, size) {
  const pixels = Buffer.alloc(size * size * 4);

  for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
    const sourceRow = clamp(((rowIndex + 0.5) * image.height) / size - 0.5, 0, image.height - 1);
    const topRow = Math.floor(sourceRow);
    const bottomRow = Math.min(image.height - 1, topRow + 1);
    const verticalAmount = sourceRow - topRow;

    for (let columnIndex = 0; columnIndex < size; columnIndex += 1) {
      const sourceColumn = clamp(
        ((columnIndex + 0.5) * image.width) / size - 0.5,
        0,
        image.width - 1,
      );
      const leftColumn = Math.floor(sourceColumn);
      const rightColumn = Math.min(image.width - 1, leftColumn + 1);
      const horizontalAmount = sourceColumn - leftColumn;
      const targetOffset = (rowIndex * size + columnIndex) * 4;

      for (let channelIndex = 0; channelIndex < 4; channelIndex += 1) {
        const topValue =
          pixelChannel(image, leftColumn, topRow, channelIndex) * (1 - horizontalAmount)
          + pixelChannel(image, rightColumn, topRow, channelIndex) * horizontalAmount;
        const bottomValue =
          pixelChannel(image, leftColumn, bottomRow, channelIndex) * (1 - horizontalAmount)
          + pixelChannel(image, rightColumn, bottomRow, channelIndex) * horizontalAmount;
        pixels[targetOffset + channelIndex] = Math.round(
          topValue * (1 - verticalAmount) + bottomValue * verticalAmount,
        );
      }
    }
  }

  return { width: size, height: size, pixels };
}

function removeLightBackground(image) {
  const pixels = Buffer.from(image.pixels);
  const backgroundRed = 253;
  const backgroundGreen = 253;
  const backgroundBlue = 253;
  const transparentDistance = 70;

  for (let pixelOffset = 0; pixelOffset < pixels.length; pixelOffset += 4) {
    const highestChannel = Math.max(
      pixels[pixelOffset],
      pixels[pixelOffset + 1],
      pixels[pixelOffset + 2],
    );
    const lowestChannel = Math.min(
      pixels[pixelOffset],
      pixels[pixelOffset + 1],
      pixels[pixelOffset + 2],
    );
    const redDistance = pixels[pixelOffset] - backgroundRed;
    const greenDistance = pixels[pixelOffset + 1] - backgroundGreen;
    const blueDistance = pixels[pixelOffset + 2] - backgroundBlue;
    const distance = Math.sqrt(
      redDistance * redDistance + greenDistance * greenDistance + blueDistance * blueDistance,
    );
    const channelSpread = highestChannel - lowestChannel;
    const isDarkForeground = 255 - highestChannel > 58;
    const isSaturatedForeground = channelSpread > 28 && distance > 36;

    pixels[pixelOffset + 3] =
      distance > transparentDistance || isDarkForeground || isSaturatedForeground ? 255 : 0;
  }

  return { width: image.width, height: image.height, pixels };
}

function createPng(image) {
  const rawPixels = Buffer.alloc(image.height * (1 + image.width * 4));

  for (let rowIndex = 0; rowIndex < image.height; rowIndex += 1) {
    const targetOffset = rowIndex * (1 + image.width * 4);
    const sourceOffset = rowIndex * image.width * 4;
    rawPixels[targetOffset] = 0;
    image.pixels.copy(rawPixels, targetOffset + 1, sourceOffset, sourceOffset + image.width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    pngSignature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', deflateSync(rawPixels, { level: 9 })),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

function createPngFactory(sourceImage) {
  const cache = new Map();

  return (size) => {
    if (!cache.has(size)) cache.set(size, createPng(resizeImage(sourceImage, size)));
    return cache.get(size);
  };
}

function createIco(createPngForSize) {
  const iconSizes = [16, 24, 32, 48, 64, 128, 256];
  const pngImages = iconSizes.map((size) => ({ size, data: createPngForSize(size) }));
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

function createIcns(createPngForSize) {
  const entries = [
    { type: 'ic07', data: createPngForSize(128) },
    { type: 'ic08', data: createPngForSize(256) },
    { type: 'ic09', data: createPngForSize(512) },
    { type: 'ic10', data: createPngForSize(1024) },
  ];
  const totalLength = 8 + entries.reduce((sum, entry) => sum + 8 + entry.data.length, 0);
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(totalLength, 4);
  const chunks = entries.map((entry) => {
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write(entry.type, 0, 4);
    chunkHeader.writeUInt32BE(entry.data.length + 8, 4);
    return Buffer.concat([chunkHeader, entry.data]);
  });
  return Buffer.concat([header, ...chunks]);
}

mkdirSync(buildDirectory, { recursive: true });
mkdirSync(rendererAssetDirectory, { recursive: true });

const sourceImage = parsePng(readFileSync(sourcePngPath));
const createPngForSize = createPngFactory(sourceImage);
const splashImage = parsePng(readFileSync(sourceSplashPath));

copyFileSync(sourceSvgPath, resolve(buildDirectory, 'icon.svg'));
writeFileSync(resolve(buildDirectory, 'icon.png'), createPngForSize(1024));
writeFileSync(resolve(buildDirectory, 'icon.ico'), createIco(createPngForSize));
writeFileSync(resolve(buildDirectory, 'icon.icns'), createIcns(createPngForSize));
writeFileSync(resolve(rendererAssetDirectory, 'app-icon.png'), createPngForSize(256));
writeFileSync(
  resolve(rendererAssetDirectory, 'splash-logo.png'),
  createPng(removeLightBackground(splashImage)),
);

const sourceHash = createHash('sha256').update(readFileSync(sourcePngPath)).digest('hex').slice(
  0,
  12,
);
console.log(`Generated desktop icons from ${sourcePngPath} (${sourceHash})`);
