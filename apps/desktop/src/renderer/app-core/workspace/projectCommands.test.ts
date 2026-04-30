import type {
  ActivityLogAppendInput,
  ProjectAddInput,
  ProjectSummary,
} from '@firebase-desk/repo-contracts';
import { describe, expect, it, vi } from 'vitest';
import {
  addProjectCommand,
  type ProjectCommandEnvironment,
  removeProjectCommand,
  updateProjectCommand,
} from './projectCommands.ts';

describe('project commands', () => {
  it('adds projects, invalidates list data, and records activity', async () => {
    const context = commandContext();
    const result = await addProjectCommand(context.env, addInput);

    expect(context.projects.add).toHaveBeenCalledWith(addInput);
    expect(context.invalidateProjects).toHaveBeenCalledTimes(1);
    expect(result.lastAction).toBe('Added Local Emulator');
    expect(context.activity.at(-1)).toMatchObject({
      action: 'Add account',
      metadata: { projectId: 'demo-local', target: 'emulator' },
      status: 'success',
    });
  });

  it('updates projects and records changed keys', async () => {
    const context = commandContext();
    await updateProjectCommand(context.env, {
      id: 'emu',
      patch: { name: 'Local Emulator Updated' },
    });

    expect(context.projects.update).toHaveBeenCalledWith('emu', {
      name: 'Local Emulator Updated',
    });
    expect(context.activity.at(-1)).toMatchObject({
      action: 'Update account',
      metadata: { changedKeys: ['name'] },
      status: 'success',
    });
  });

  it('removes projects and rethrows failures after recording activity', async () => {
    const context = commandContext({
      remove: vi.fn(async () => Promise.reject(new Error('denied'))),
    });

    await expect(removeProjectCommand(context.env, {
      connectionId: 'emu',
      project,
    })).rejects.toThrow('denied');
    expect(context.activity.at(-1)).toMatchObject({
      action: 'Remove account',
      error: { message: 'denied' },
      status: 'failure',
    });
  });
});

const addInput: ProjectAddInput = {
  emulator: { authHost: '127.0.0.1:9099', firestoreHost: '127.0.0.1:8080' },
  name: 'Local Emulator',
  projectId: 'demo-local',
  target: 'emulator',
};

const project: ProjectSummary = {
  createdAt: '2026-01-01T00:00:00.000Z',
  credentialEncrypted: null,
  hasCredential: false,
  id: 'emu',
  name: 'Local Emulator',
  projectId: 'demo-local',
  target: 'emulator',
};

function commandContext(
  overrides: Partial<ProjectCommandEnvironment['projects']> = {},
) {
  const activity: ActivityLogAppendInput[] = [];
  const projects = {
    add: vi.fn(async () => project),
    remove: vi.fn(async () => {}),
    update: vi.fn(async () => project),
    ...overrides,
  };
  const invalidateProjects = vi.fn(async () => {});
  let time = 100;
  const env: ProjectCommandEnvironment = {
    invalidateProjects,
    now: () => time += 5,
    projects,
    recordActivity: (input) => {
      activity.push(input);
    },
  };
  return { activity, env, invalidateProjects, projects };
}
