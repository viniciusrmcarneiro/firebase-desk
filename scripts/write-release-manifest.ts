import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface PackageJson {
  readonly version: string;
}

interface ReleaseManifestAsset {
  readonly arch: string | null;
  readonly kind: 'checksums' | 'package';
  readonly name: string;
  readonly path: string;
  readonly platform: string | null;
  readonly sha256: string;
  readonly size: number;
}

interface ReleaseManifest {
  readonly appId: 'dev.firebase-desk.app';
  readonly assets: ReadonlyArray<ReleaseManifestAsset>;
  readonly channel: string;
  readonly commit: string;
  readonly generatedAt: string;
  readonly packageManagers: {
    readonly homebrewTap: string;
    readonly scoopBucket: string;
  };
  readonly releaseUrl: string | null;
  readonly schemaVersion: 1;
  readonly version: string;
}

const repositoryRoot = fileURLToRepositoryRoot();
const artifactExtensions = new Set(['.AppImage', '.deb', '.dmg', '.exe', '.zip']);

void main();

async function main(): Promise<void> {
  const artifactsDirectory = resolve(
    repositoryRoot,
    process.env['RELEASE_ARTIFACTS_DIR'] ?? 'apps/desktop/release',
  );
  const outputPath = resolve(
    repositoryRoot,
    process.env['RELEASE_MANIFEST_FILE'] ?? 'apps/desktop/release/release-manifest.json',
  );
  const desktopPackage = JSON.parse(
    await readFile(resolve(repositoryRoot, 'apps/desktop/package.json'), 'utf8'),
  ) as PackageJson;
  const files = await recursiveFiles(artifactsDirectory);
  const candidates = files.filter((filePath) =>
    isPackageArtifact(filePath) || isChecksumFile(filePath)
  );

  if (candidates.length === 0) {
    throw new Error(`No release artifacts found in ${artifactsDirectory}`);
  }

  const assets = await Promise.all(
    sortStrings(candidates).map(assetFromFile),
  );
  const manifest: ReleaseManifest = {
    appId: 'dev.firebase-desk.app',
    assets,
    channel: process.env['RELEASE_CHANNEL'] ?? 'local',
    commit: process.env['RELEASE_COMMIT'] ?? process.env['GITHUB_SHA'] ?? 'local',
    generatedAt: new Date().toISOString(),
    packageManagers: {
      homebrewTap: process.env['HOMEBREW_TAP_REPOSITORY'] ?? 'viniciusrmcarneiro/homebrew-tap',
      scoopBucket: process.env['SCOOP_BUCKET_REPOSITORY'] ?? 'viniciusrmcarneiro/scoop-bucket',
    },
    releaseUrl: process.env['RELEASE_URL'] ?? null,
    schemaVersion: 1,
    version: process.env['RELEASE_VERSION'] ?? desktopPackage.version,
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${outputPath}`);
}

async function recursiveFiles(directory: string): Promise<ReadonlyArray<string>> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile())
    .map((entry) => resolve(directory, entry.name));
  const nestedFiles = await Promise.all(
    entries.filter((entry) => entry.isDirectory()).map((entry) =>
      recursiveFiles(resolve(directory, entry.name))
    ),
  );
  return files.concat(...nestedFiles);
}

async function assetFromFile(filePath: string): Promise<ReleaseManifestAsset> {
  const fileStat = await stat(filePath);
  return {
    arch: archFromName(basename(filePath)),
    kind: isChecksumFile(filePath) ? 'checksums' : 'package',
    name: basename(filePath),
    path: basename(filePath),
    platform: platformFromName(basename(filePath)),
    sha256: await digest(filePath),
    size: fileStat.size,
  };
}

function isPackageArtifact(filePath: string): boolean {
  return artifactExtensions.has(extname(filePath));
}

function isChecksumFile(filePath: string): boolean {
  return basename(filePath).startsWith('SHA256SUMS') && filePath.endsWith('.txt');
}

async function digest(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest('hex');
}

function platformFromName(fileName: string): string | null {
  if (fileName.includes('mac') || fileName.includes('macos')) return 'macos';
  if (fileName.includes('win') || fileName.includes('windows')) return 'windows';
  if (fileName.includes('linux')) return 'linux';
  return null;
}

function archFromName(fileName: string): string | null {
  if (fileName.includes('arm64') || fileName.includes('ARM64')) return 'arm64';
  if (fileName.includes('x64') || fileName.includes('X64')) return 'x64';
  if (fileName.includes('x86_64') || fileName.includes('amd64')) return 'x64';
  return null;
}

function sortStrings(values: ReadonlyArray<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function fileURLToRepositoryRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), '..');
}
