import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface ReleaseManifestAsset {
  readonly arch: string | null;
  readonly kind: 'checksums' | 'package';
  readonly name: string;
  readonly platform: string | null;
  readonly sha256: string;
}

interface ReleaseManifest {
  readonly assets: ReadonlyArray<ReleaseManifestAsset>;
  readonly packageManagers: {
    readonly homebrewTap: string;
    readonly scoopBucket: string;
  };
  readonly releaseUrl: string | null;
  readonly version: string;
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

void main();

async function main(): Promise<void> {
  const manifestPath = resolve(
    repositoryRoot,
    process.env['RELEASE_MANIFEST_FILE'] ?? 'apps/desktop/release/release-manifest.json',
  );
  const outputDirectory = resolve(
    repositoryRoot,
    process.env['PACKAGE_MANAGER_MANIFEST_DIR'] ?? 'package-manager-manifests',
  );
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as ReleaseManifest;
  const repository = process.env['GITHUB_REPOSITORY'] ?? 'viniciusrmcarneiro/firebase-desk';
  const tag = process.env['RELEASE_TAG'] ?? `v${manifest.version}`;
  const releaseBaseUrl = releaseDownloadBaseUrl(repository, tag);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(
    resolve(outputDirectory, 'firebase-desk.rb'),
    homebrewCask(manifest, repository, releaseBaseUrl),
  );
  await writeFile(
    resolve(outputDirectory, 'firebase-desk.json'),
    `${JSON.stringify(scoopManifest(manifest, repository, releaseBaseUrl), null, 2)}\n`,
  );
  console.log(`Wrote package manager manifests to ${outputDirectory}`);
}

function homebrewCask(
  manifest: ReleaseManifest,
  repository: string,
  releaseBaseUrl: string,
): string {
  const asset = findAsset(manifest, {
    extension: '.dmg',
    platform: 'macos',
  });
  const releaseUrl = manifest.releaseUrl
    ?? `https://github.com/${repository}/releases/tag/v${manifest.version}`;
  return `cask "firebase-desk" do
  version "${manifest.version}"
  sha256 "${asset.sha256}"

  url "${assetUrl(releaseBaseUrl, asset.name)}",
      verified: "github.com/${repository}/"
  name "Firebase Desk"
  desc "Desktop Firebase admin client"
  homepage "${releaseUrl}"

  app "Firebase Desk.app"
end
`;
}

function scoopManifest(
  manifest: ReleaseManifest,
  repository: string,
  releaseBaseUrl: string,
): Record<string, unknown> {
  const asset = findAsset(manifest, {
    extension: '.zip',
    platform: 'windows',
  });
  const repositoryUrl = `https://github.com/${repository}`;
  const autoupdateBaseUrl = releaseDownloadBaseUrl(repository, 'v$version');
  const autoupdateAssetName = asset.name.replaceAll(manifest.version, '$version');
  return {
    version: manifest.version,
    description: 'Desktop Firebase admin client',
    homepage: repositoryUrl,
    license: 'MIT',
    architecture: {
      '64bit': {
        url: assetUrl(releaseBaseUrl, asset.name),
        hash: asset.sha256,
      },
    },
    shortcuts: [
      ['Firebase Desk.exe', 'Firebase Desk'],
    ],
    checkver: {
      github: repositoryUrl,
    },
    autoupdate: {
      architecture: {
        '64bit': {
          url: assetUrl(autoupdateBaseUrl, autoupdateAssetName),
        },
      },
    },
  };
}

function findAsset(
  manifest: ReleaseManifest,
  criteria: { readonly extension: string; readonly platform: string; },
): ReleaseManifestAsset {
  const asset = manifest.assets.find((item) =>
    item.kind === 'package'
    && item.platform === criteria.platform
    && item.name.endsWith(criteria.extension)
  );

  if (!asset) {
    throw new Error(`Missing ${criteria.platform} ${criteria.extension} release asset.`);
  }

  return asset;
}

function releaseDownloadBaseUrl(repository: string, tag: string): string {
  return `https://github.com/${repository}/releases/download/${encodePathSegment(tag)}`;
}

function assetUrl(releaseBaseUrl: string, assetName: string): string {
  return `${releaseBaseUrl}/${encodePathSegment(assetName)}`;
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replaceAll('%24version', '$version');
}
