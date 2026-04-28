import { describe, expect, it, vi } from 'vitest';
import { IpcScriptRunnerRepository } from './ipc-script-runner-repository.ts';

describe('IpcScriptRunnerRepository', () => {
  it('runs and cancels through IPC', async () => {
    const scriptRunner = {
      run: vi.fn().mockResolvedValue({
        returnValue: { ok: true },
        stream: [],
        logs: [],
        errors: [],
        durationMs: 5,
      }),
      cancel: vi.fn().mockResolvedValue(undefined),
    } satisfies DesktopScriptRunnerApi;
    Object.defineProperty(window, 'firebaseDesk', {
      configurable: true,
      value: { scriptRunner },
    });
    const repository = new IpcScriptRunnerRepository();

    await expect(repository.run({
      runId: 'run-1',
      connectionId: 'emu',
      source: 'return { ok: true };',
    })).resolves.toMatchObject({ returnValue: { ok: true } });
    await expect(repository.cancel('run-1')).resolves.toBeUndefined();

    expect(scriptRunner.run).toHaveBeenCalledWith({
      runId: 'run-1',
      connectionId: 'emu',
      source: 'return { ok: true };',
    });
    expect(scriptRunner.cancel).toHaveBeenCalledWith({ runId: 'run-1' });
  });
});
