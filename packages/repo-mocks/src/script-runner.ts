import type {
  ScriptRunnerRepository,
  ScriptRunRequest,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';

export class MockScriptRunnerRepository implements ScriptRunnerRepository {
  async run(request: ScriptRunRequest): Promise<ScriptRunResult> {
    return {
      returnValue: { ok: true, source: request.source.length },
      logs: [
        { level: 'log', message: 'mock script invoked', timestamp: new Date().toISOString() },
      ],
      errors: [],
      durationMs: 0,
    };
  }
}
