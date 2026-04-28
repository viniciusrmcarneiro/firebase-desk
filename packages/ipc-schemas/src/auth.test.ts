import { describe, expect, it } from 'vitest';
import { IPC_CHANNELS } from './channels.ts';

describe('auth IPC schemas', () => {
  it('validates custom claims writes', () => {
    expect(IPC_CHANNELS['auth.setCustomClaims'].request.parse({
      projectId: 'demo-local',
      uid: 'u_ada',
      claims: { role: 'owner' },
    })).toEqual({
      projectId: 'demo-local',
      uid: 'u_ada',
      claims: { role: 'owner' },
    });

    expect(() =>
      IPC_CHANNELS['auth.setCustomClaims'].request.parse({
        projectId: 'demo-local',
        uid: 'u_ada',
        claims: ['owner'],
      })
    ).toThrow();
  });
});
