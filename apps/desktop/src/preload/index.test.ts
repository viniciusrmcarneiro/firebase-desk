import { SCRIPT_RUN_EVENT_CHANNEL } from '@firebase-desk/ipc-schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DesktopApi } from './index.ts';

const electronMocks = vi.hoisted(() => ({
  exposeInMainWorld: vi.fn(),
  invoke: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
}));

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: electronMocks.exposeInMainWorld,
  },
  ipcRenderer: {
    invoke: electronMocks.invoke,
    on: electronMocks.on,
    removeListener: electronMocks.removeListener,
  },
}));

describe('preload script runner api', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    await import('./index.ts');
  });

  it('subscribes and unsubscribes to script runner events', () => {
    const api = exposedApi();
    const listener = vi.fn();
    const unsubscribe = api.scriptRunner.subscribe(listener);
    const handler = electronMocks.on.mock.calls[0]?.[1] as (
      event: unknown,
      payload: unknown,
    ) => void;

    handler({}, {
      type: 'log',
      runId: 'run-1',
      log: { level: 'info', message: 'ready', timestamp: '2026-04-28T00:00:00.000Z' },
    });
    unsubscribe();

    expect(electronMocks.on).toHaveBeenCalledWith(SCRIPT_RUN_EVENT_CHANNEL, handler);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ type: 'log', runId: 'run-1' }));
    expect(electronMocks.removeListener).toHaveBeenCalledWith(SCRIPT_RUN_EVENT_CHANNEL, handler);
  });

  it('ignores invalid script runner events', () => {
    const api = exposedApi();
    const listener = vi.fn();
    api.scriptRunner.subscribe(listener);
    const handler = electronMocks.on.mock.calls[0]?.[1] as (
      event: unknown,
      payload: unknown,
    ) => void;

    expect(() => handler({}, { type: 'invalid', runId: 'run-1' })).not.toThrow();

    expect(listener).not.toHaveBeenCalled();
  });

  it('exposes Firestore write methods', async () => {
    const api = exposedApi();
    electronMocks.invoke
      .mockResolvedValueOnce({
        id: 'ord_1',
        path: 'orders/ord_1',
        data: { status: 'paid' },
        hasSubcollections: false,
      })
      .mockResolvedValueOnce(undefined);

    await expect(api.firestore.saveDocument({
      connectionId: 'emu',
      documentPath: 'orders/ord_1',
      data: { status: 'paid' },
    })).resolves.toMatchObject({ id: 'ord_1' });
    await expect(api.firestore.deleteDocument({
      connectionId: 'emu',
      documentPath: 'orders/ord_1',
      options: { deleteSubcollectionPaths: ['orders/ord_1/events'] },
    })).resolves.toBeUndefined();

    expect(electronMocks.invoke).toHaveBeenCalledWith('firestore.saveDocument', {
      connectionId: 'emu',
      documentPath: 'orders/ord_1',
      data: { status: 'paid' },
    });
    expect(electronMocks.invoke).toHaveBeenCalledWith('firestore.deleteDocument', {
      connectionId: 'emu',
      documentPath: 'orders/ord_1',
      options: { deleteSubcollectionPaths: ['orders/ord_1/events'] },
    });
  });
});

function exposedApi(): DesktopApi {
  return electronMocks.exposeInMainWorld.mock.calls[0]?.[1] as DesktopApi;
}
