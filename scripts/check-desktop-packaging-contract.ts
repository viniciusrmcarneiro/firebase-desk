import { readFile } from 'node:fs/promises';

import {
  bundledMainPackages,
  mainExternalizeDeps,
  workspaceRuntimePackages,
} from '../apps/desktop/src/main/packaging/main-externalize-deps.ts';

void main();

async function main(): Promise<void> {
  const desktopPackageJson = JSON.parse(
    await readFile(new URL('../apps/desktop/package.json', import.meta.url), 'utf8'),
  ) as {
    dependencies: Record<string, string>;
  };

  const workspaceDependencies = Object.keys(desktopPackageJson.dependencies)
    .filter((packageName) => packageName.startsWith('@firebase-desk/'));
  const workspaceDependencySet = new Set(workspaceDependencies);
  const bundledDependencySet = new Set([...workspaceDependencies, 'firebase-admin']);
  const problems: string[] = [];

  if (!setsEqual(new Set(workspaceRuntimePackages), workspaceDependencySet)) {
    problems.push(
      `workspaceRuntimePackages does not match desktop workspace dependencies: ${
        JSON.stringify(workspaceDependencies)
      }`,
    );
  }

  if (!setsEqual(new Set(bundledMainPackages), bundledDependencySet)) {
    problems.push(
      `bundledMainPackages does not match expected bundled desktop dependencies: ${
        JSON.stringify([...bundledDependencySet])
      }`,
    );
  }

  if (!setsEqual(new Set(mainExternalizeDeps.exclude ?? []), bundledDependencySet)) {
    problems.push(
      `mainExternalizeDeps.exclude does not match expected bundled desktop dependencies: ${
        JSON.stringify([...bundledDependencySet])
      }`,
    );
  }

  if (Object.hasOwn(mainExternalizeDeps, 'include')) {
    problems.push('mainExternalizeDeps.include should be absent.');
  }

  if (problems.length > 0) {
    console.error('Desktop packaging contract violations found:\n');
    for (const problem of problems) {
      console.error(`- ${problem}`);
    }
    process.exit(1);
  }

  console.log('Desktop packaging contract OK.');
}

function setsEqual(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left.size !== right.size) return false;
  for (const item of left) {
    if (!right.has(item)) return false;
  }
  return true;
}
