import type {
  AuthRepository,
  AuthUser,
  Page,
  PageRequest,
  ScriptRunnerRepository,
  ScriptRunRequest,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';

const AUTH_UNAVAILABLE_MESSAGE = 'Authentication live data is not available yet.';
const SCRIPT_RUNNER_UNAVAILABLE_MESSAGE = 'JavaScript Query live execution is not available yet.';

export class UnsupportedLiveAuthRepository implements AuthRepository {
  async listUsers(_projectId: string, _request?: PageRequest): Promise<Page<AuthUser>> {
    throw new Error(AUTH_UNAVAILABLE_MESSAGE);
  }

  async getUser(_projectId: string, _uid: string): Promise<AuthUser | null> {
    throw new Error(AUTH_UNAVAILABLE_MESSAGE);
  }

  async searchUsers(_projectId: string, _query: string): Promise<ReadonlyArray<AuthUser>> {
    throw new Error(AUTH_UNAVAILABLE_MESSAGE);
  }
}

export class UnsupportedLiveScriptRunnerRepository implements ScriptRunnerRepository {
  async run(_request: ScriptRunRequest): Promise<ScriptRunResult> {
    throw new Error(SCRIPT_RUNNER_UNAVAILABLE_MESSAGE);
  }
}
