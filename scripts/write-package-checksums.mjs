import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, '..');
const releaseDirectory = resolve(repositoryRoot, 'apps/desktop/release');
const outputFileName = process.env['CHECKSUM_FILE_NAME'] ?? resolveDefaultOutputFileName();
const outputPath = resolve(releaseDirectory, outputFileName);
const artifactExtensions = new Set(['.AppImage', '.deb', '.dmg', '.exe', '.zip']);

function resolveDefaultOutputFileName() {
  const nameParts = [
    'SHA256SUMS',
    process.env['RELEASE_CHANNEL'],
    process.env['CHECKSUM_PLATFORM'],
    process.env['RUNNER_ARCH'],
  ].filter((part) => typeof part === 'string' && part.length > 0);
  return `${nameParts.join('-')}.txt`;
}

function hasArtifactExtension(fileName) {
  return Array.from(artifactExtensions).some((extension) => fileName.endsWith(extension));
}

function insertArtifactName(sortedNames, artifactName) {
  const insertIndex = sortedNames.findIndex((existingName) => {
    return artifactName.localeCompare(existingName) < 0;
  });

  if (insertIndex === -1) return [...sortedNames, artifactName];

  return [
    ...sortedNames.slice(0, insertIndex),
    artifactName,
    ...sortedNames.slice(insertIndex),
  ];
}

const artifactNames = readdirSync(releaseDirectory)
  .filter(hasArtifactExtension)
  .reduce(insertArtifactName, []);

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
