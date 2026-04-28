import type { ProjectSummary, ScriptRunRequest } from '@firebase-desk/repo-contracts';

export interface ScriptRunnerConnection {
  readonly credentialJson?: string | null;
  readonly project: ProjectSummary;
}

export interface ScriptWorkerRunMessage {
  readonly type: 'run';
  readonly request: ScriptRunRequest;
  readonly connection: ScriptRunnerConnection;
}

export interface ScriptWorkerResultMessage {
  readonly type: 'result';
  readonly result: import('@firebase-desk/repo-contracts').ScriptRunResult;
}

export interface ScriptWorkerErrorMessage {
  readonly type: 'error';
  readonly error: string;
}

export type ScriptWorkerMessage = ScriptWorkerRunMessage;
export type ScriptWorkerResponse = ScriptWorkerResultMessage | ScriptWorkerErrorMessage;
