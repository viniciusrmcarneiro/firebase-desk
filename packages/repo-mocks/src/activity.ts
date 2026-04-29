import {
  type ActivityLogAppendInput,
  type ActivityLogEntry,
  type ActivityLogExportResult,
  type ActivityLogListRequest,
  type ActivityLogRepository,
} from '@firebase-desk/repo-contracts';

export class MockActivityLogRepository implements ActivityLogRepository {
  private entries: ActivityLogEntry[] = [];
  private nextId = 1;

  async append(input: ActivityLogAppendInput): Promise<ActivityLogEntry> {
    const entry: ActivityLogEntry = {
      ...input,
      id: `activity-${this.nextId++}`,
      timestamp: new Date().toISOString(),
    };
    this.entries = [cloneEntry(entry), ...this.entries];
    return cloneEntry(entry);
  }

  async clear(): Promise<void> {
    this.entries = [];
  }

  async export(_request?: ActivityLogListRequest): Promise<ActivityLogExportResult> {
    return { canceled: true };
  }

  async list(request?: ActivityLogListRequest): Promise<ReadonlyArray<ActivityLogEntry>> {
    return filterEntries(this.entries, request).map(cloneEntry);
  }
}

function filterEntries(
  entries: ReadonlyArray<ActivityLogEntry>,
  request?: ActivityLogListRequest,
): ReadonlyArray<ActivityLogEntry> {
  const search = request?.search?.trim().toLowerCase() ?? '';
  return entries.filter((entry) => {
    if (request?.area && request.area !== 'all' && entry.area !== request.area) return false;
    if (request?.status && request.status !== 'all' && entry.status !== request.status) {
      return false;
    }
    if (!search) return true;
    return [
      entry.action,
      entry.area,
      entry.status,
      entry.summary,
      entry.target?.label,
      entry.target?.path,
      entry.target?.uid,
    ].some((value) => value?.toLowerCase().includes(search));
  }).slice(0, request?.limit ?? entries.length);
}

function cloneEntry(entry: ActivityLogEntry): ActivityLogEntry {
  return JSON.parse(JSON.stringify(entry)) as ActivityLogEntry;
}
