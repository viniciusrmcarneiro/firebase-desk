import type { AuthUser, ProjectSummary } from '@firebase-desk/repo-contracts';
import type { FixtureCollection, FixtureDocument } from './index.ts';

export function createProjectFixture(
  patch: Partial<ProjectSummary> = {},
): ProjectSummary {
  const id = patch.id ?? 'fixture-project';
  return {
    id,
    name: patch.name ?? 'Fixture Project',
    projectId: patch.projectId ?? id,
    target: patch.target ?? 'emulator',
  };
}

export function createFixtureDocument(
  id = 'fixture_doc',
  data: Record<string, unknown> = {},
): FixtureDocument {
  return { id, data };
}

export function createFixtureCollection(
  path = 'fixtureCollection',
  docs: ReadonlyArray<FixtureDocument> = [createFixtureDocument()],
): FixtureCollection {
  return { path, docs };
}

export function createAuthUserFixture(patch: Partial<AuthUser> = {}): AuthUser {
  const uid = patch.uid ?? 'u_fixture';
  return {
    uid,
    email: patch.email ?? `${uid}@example.com`,
    displayName: patch.displayName ?? 'Fixture User',
    provider: patch.provider ?? 'password',
    disabled: patch.disabled ?? false,
    customClaims: patch.customClaims ?? { role: 'viewer', permissions: ['read'] },
  };
}
