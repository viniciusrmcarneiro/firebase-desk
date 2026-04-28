import type {
  ScriptRunnerRepository,
  ScriptRunRequest,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';

export class IpcScriptRunnerRepository implements ScriptRunnerRepository {
  async run(request: ScriptRunRequest): Promise<ScriptRunResult> {
    const result = await window.firebaseDesk.scriptRunner.run(request);
    return {
      returnValue: result.returnValue,
      ...(result.stream ? { stream: result.stream } : {}),
      logs: result.logs,
      errors: result.errors.map((error) => ({
        ...(error.name ? { name: error.name } : {}),
        ...(error.code ? { code: error.code } : {}),
        message: error.message,
        ...(error.stack ? { stack: error.stack } : {}),
      })),
      durationMs: result.durationMs,
      ...(result.cancelled !== undefined ? { cancelled: result.cancelled } : {}),
    };
  }

  async cancel(runId: string): Promise<void> {
    await window.firebaseDesk.scriptRunner.cancel({ runId });
  }
}
