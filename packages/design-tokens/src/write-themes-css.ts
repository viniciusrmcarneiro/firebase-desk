import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateThemesCss } from './cssVariables.ts';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputFiles = [
  resolve(packageRoot, 'src/themes.css'),
  resolve(packageRoot, '.build/dist/themes.css'),
];

await Promise.all(
  outputFiles.map(async (outputFile) => {
    await mkdir(dirname(outputFile), { recursive: true });
    await writeFile(outputFile, generateThemesCss());
  }),
);
