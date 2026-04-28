import type {
  ScriptRunEventListener,
  ScriptRunnerRepository,
  ScriptRunRequest,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';

const SCRIPT_RUNNER_UNAVAILABLE_MESSAGE = 'JavaScript Query live execution is not available yet.';

export class UnsupportedLiveScriptRunnerRepository implements ScriptRunnerRepository {
  async run(_request: ScriptRunRequest): Promise<ScriptRunResult> {
    throw new Error(SCRIPT_RUNNER_UNAVAILABLE_MESSAGE);
  }

  async cancel(_runId: string): Promise<void> {
    throw new Error(SCRIPT_RUNNER_UNAVAILABLE_MESSAGE);
  }

  subscribe(_listener: ScriptRunEventListener): () => void {
    return () => {};
  }
}
