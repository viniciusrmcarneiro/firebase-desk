import type { ActivityLogRepository } from '@firebase-desk/repo-contracts';
import type { IpcHandlerMap } from './handler-types.ts';

export function createActivityHandlers(
  activityLogRepository: ActivityLogRepository,
): Pick<
  IpcHandlerMap,
  'activity.append' | 'activity.clear' | 'activity.export' | 'activity.list'
> {
  return {
    'activity.append': (request) => activityLogRepository.append(request),
    'activity.clear': async () => {
      await activityLogRepository.clear();
    },
    'activity.export': (request) => activityLogRepository.export(request),
    'activity.list': async (request) => [...await activityLogRepository.list(request)],
  };
}
