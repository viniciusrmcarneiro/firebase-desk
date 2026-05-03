import { readFile } from 'node:fs/promises';

interface PackageJson {
  readonly name?: string;
  readonly version?: string;
}

const semverPattern = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const problems: string[] = [];

void main();

async function main(): Promise<void> {
  const rootPackage = await readPackageJson(new URL('../package.json', import.meta.url));
  const desktopPackage = await readPackageJson(
    new URL('../apps/desktop/package.json', import.meta.url),
  );

  const rootVersion = requireVersion(rootPackage, 'package.json');
  const desktopVersion = requireVersion(desktopPackage, 'apps/desktop/package.json');

  if (rootVersion !== desktopVersion) {
    problems.push(
      `package.json version ${rootVersion} must match apps/desktop/package.json version ${desktopVersion}.`,
    );
  }

  if (!semverPattern.test(desktopVersion)) {
    problems.push(`apps/desktop/package.json version must be semver, got ${desktopVersion}.`);
  }

  const releaseTag = releaseTagFromEnvironment();
  if (releaseTag && releaseTag !== `v${desktopVersion}`) {
    problems.push(
      `Release tag ${releaseTag} must match apps/desktop/package.json version v${desktopVersion}.`,
    );
  }

  if (problems.length > 0) {
    console.error('Release version violations found:\n');
    for (const problem of problems) console.error(`- ${problem}`);
    process.exit(1);
  }

  console.log('Release version invariants OK.');
}

async function readPackageJson(url: URL): Promise<PackageJson> {
  return JSON.parse(await readFile(url, 'utf8')) as PackageJson;
}

function requireVersion(packageJson: PackageJson, fileName: string): string {
  if (typeof packageJson.version === 'string' && packageJson.version.length > 0) {
    return packageJson.version;
  }
  problems.push(`${fileName} must declare a version.`);
  return '';
}

function releaseTagFromEnvironment(): string | null {
  const explicit = process.env['RELEASE_TAG'];
  if (explicit) return explicit;

  const githubRef = process.env['GITHUB_REF'];
  if (githubRef?.startsWith('refs/tags/v')) return githubRef.replace('refs/tags/', '');

  return null;
}
