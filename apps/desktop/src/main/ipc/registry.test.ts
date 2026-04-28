import { SCRIPT_RUN_EVENT_CHANNEL } from '@firebase-desk/ipc-schemas';
import { describe, expect, it, vi } from 'vitest';
import { broadcastScriptRunEvent } from './registry.ts';

const electronMocks = vi.hoisted(() => ({
  getAllWindows: vi.fn(),
}));

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/tmp/firebase-desk-test'), getVersion: vi.fn(() => '0.0.0') },
  BrowserWindow: { getAllWindows: electronMocks.getAllWindows },
  dialog: { showOpenDialog: vi.fn() },
  ipcMain: { handle: vi.fn() },
  safeStorage: {
    isEncryptionAvailable: () => false,
    encryptString: (value: string) => Buffer.from(value),
    decryptString: (value: Buffer) => value.toString('utf8'),
  },
  shell: { openPath: vi.fn() },
}));

describe('script runner IPC event broadcast', () => {
  it('sends live script events to renderer windows', () => {
    const send = vi.fn();
    electronMocks.getAllWindows.mockReturnValue([{ webContents: { send } }]);

    broadcastScriptRunEvent({
      type: 'output',
      runId: 'run-1',
      item: {
        id: 'yield-1',
        label: 'yield 1',
        badge: 'number',
        view: 'json',
        value: 1,
      },
    });

    expect(send).toHaveBeenCalledWith(
      SCRIPT_RUN_EVENT_CHANNEL,
      expect.objectContaining({ type: 'output', runId: 'run-1' }),
    );
  });
});
