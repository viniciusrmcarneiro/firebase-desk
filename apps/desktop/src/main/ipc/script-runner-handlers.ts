import type { ScriptRunnerRepository } from '@firebase-desk/repo-contracts';
import { toIpcScriptRunResult } from './converters.ts';
import type { IpcHandlerMap } from './handler-types.ts';

export function createScriptRunnerHandlers(
  scriptRunnerRepository: Pick<ScriptRunnerRepository, 'cancel' | 'run'>,
): Pick<IpcHandlerMap, 'scriptRunner.cancel' | 'scriptRunner.run'> {
  return {
    'scriptRunner.run': async (request) =>
      toIpcScriptRunResult(await scriptRunnerRepository.run(request)),
    'scriptRunner.cancel': async ({ runId }) => {
      await scriptRunnerRepository.cancel(runId);
    },
  };
}
