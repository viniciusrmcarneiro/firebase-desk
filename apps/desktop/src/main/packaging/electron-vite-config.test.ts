import { describe, expect, it } from 'vitest';
import packageJson from '../../../package.json';

import { mainExternalizeDeps, workspaceRuntimePackages } from './main-externalize-deps';

describe('electron vite config', () => {
  it('bundles desktop workspace packages into the main process output', () => {
    const workspaceDependencies = Object.keys(packageJson.dependencies)
      .filter((packageName) => packageName.startsWith('@firebase-desk/'));
    const workspaceDependencySet = new Set(workspaceDependencies);

    expect(new Set(workspaceRuntimePackages)).toEqual(workspaceDependencySet);
    expect(workspaceRuntimePackages).toHaveLength(workspaceDependencySet.size);
    expect(new Set(mainExternalizeDeps.exclude)).toEqual(workspaceDependencySet);
    expect(mainExternalizeDeps.exclude).toHaveLength(workspaceDependencySet.size);
    expect(mainExternalizeDeps.include).toContain('firebase-admin');
  });
});
