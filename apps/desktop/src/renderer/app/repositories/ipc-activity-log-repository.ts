import type { IpcRequest } from '@firebase-desk/ipc-schemas';
import type {
  ActivityLogAppendInput,
  ActivityLogEntry,
  ActivityLogExportResult,
  ActivityLogListRequest,
  ActivityLogRepository,
} from '@firebase-desk/repo-contracts';

export class IpcActivityLogRepository implements ActivityLogRepository {
  async append(input: ActivityLogAppendInput): Promise<ActivityLogEntry> {
    return await window.firebaseDesk.activity.append(input);
  }

  async clear(): Promise<void> {
    await window.firebaseDesk.activity.clear();
  }

  async export(request?: ActivityLogListRequest): Promise<ActivityLogExportResult> {
    return await window.firebaseDesk.activity.export(toIpcListRequest(request));
  }

  async list(request?: ActivityLogListRequest): Promise<ReadonlyArray<ActivityLogEntry>> {
    return await window.firebaseDesk.activity.list(toIpcListRequest(request));
  }
}

function toIpcListRequest(
  request?: ActivityLogListRequest,
): IpcRequest<'activity.list'> {
  return {
    ...(request?.area === undefined ? {} : { area: request.area }),
    ...(request?.limit === undefined ? {} : { limit: request.limit }),
    ...(request?.search === undefined ? {} : { search: request.search }),
    ...(request?.status === undefined ? {} : { status: request.status }),
  };
}
