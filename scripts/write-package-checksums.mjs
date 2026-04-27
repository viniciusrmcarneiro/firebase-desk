import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const releaseDirectory = resolve(repositoryRoot, 'apps/desktop/release');
const outputFileName = process.env['CHECKSUM_FILE_NAME'] ?? 'SHA256SUMS.txt';
const outputPath = resolve(releaseDirectory, outputFileName);
const artifactExtensions = new Set(['.AppImage', '.deb', '.dmg', '.exe', '.zip']);

function hasArtifactExtension(fileName) {
  return Array.from(artifactExtensions).some((extension) => fileName.endsWith(extension));
}

const artifactNames = readdirSync(releaseDirectory)
  .filter(hasArtifactExtension)
  .sort((leftName, rightName) => leftName.localeCompare(rightName));

if (artifactNames.length === 0) {
  throw new Error(`No package artifacts found in ${releaseDirectory}`);
}

const checksumLines = artifactNames.map((artifactName) => {
  const artifactPath = resolve(releaseDirectory, artifactName);
  const digest = createHash('sha256').update(readFileSync(artifactPath)).digest('hex');
  return `${digest}  ${basename(artifactPath)}`;
});

writeFileSync(outputPath, `${checksumLines.join('\n')}\n`);
console.log(`Wrote ${outputPath}`);
