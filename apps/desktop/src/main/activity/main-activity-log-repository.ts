import type {
  ActivityLogAppendInput,
  ActivityLogEntry,
  ActivityLogError,
  ActivityLogExportResult,
  ActivityLogListRequest,
  ActivityLogRepository,
  ActivityLogSettings,
  SettingsRepository,
} from '@firebase-desk/repo-contracts';
import { randomUUID } from 'node:crypto';
import type { ActivityLogStore } from '../storage/activity-log-store.ts';

export interface ActivityLogSaveDialog {
  showSaveDialog(): Promise<{ readonly canceled: boolean; readonly filePath?: string; }>;
}

export class MainActivityLogRepository implements ActivityLogRepository {
  constructor(
    private readonly store: ActivityLogStore,
    private readonly settings: SettingsRepository,
    private readonly saveDialog: ActivityLogSaveDialog,
  ) {}

  async append(input: ActivityLogAppendInput): Promise<ActivityLogEntry> {
    const settings = (await this.settings.load()).activityLog;
    const entry = sanitizeEntry({
      ...input,
      id: randomUUID(),
      timestamp: new Date().toISOString(),
    }, settings);
    if (settings.enabled) await this.store.append(entry, settings.maxBytes);
    return entry;
  }

  async clear(): Promise<void> {
    await this.store.clear();
  }

  async export(request?: ActivityLogListRequest): Promise<ActivityLogExportResult> {
    const result = await this.saveDialog.showSaveDialog();
    if (result.canceled || !result.filePath) return { canceled: true };
    const entries = filterEntries(await this.store.list(), request);
    await this.store.exportTo(result.filePath, reverseEntries(entries));
    return { canceled: false, filePath: result.filePath };
  }

  async list(request?: ActivityLogListRequest): Promise<ReadonlyArray<ActivityLogEntry>> {
    return filterEntries(await this.store.list(), request);
  }

  async prune(): Promise<void> {
    await this.store.prune((await this.settings.load()).activityLog.maxBytes);
  }
}

function sanitizeEntry(entry: ActivityLogEntry, settings: ActivityLogSettings): ActivityLogEntry {
  const safePayload = settings.detailMode === 'fullPayload'
    ? sanitizeRecord(entry.payload)
    : undefined;
  const candidate: ActivityLogEntry = {
    action: entry.action,
    area: entry.area,
    ...(entry.durationMs === undefined ? {} : { durationMs: entry.durationMs }),
    ...(entry.error === undefined ? {} : { error: entry.error }),
    id: entry.id,
    metadata: sanitizeRecord(entry.metadata),
    ...(safePayload ? { payload: safePayload } : {}),
    status: entry.status,
    summary: entry.summary,
    ...(entry.target === undefined ? {} : { target: entry.target }),
    timestamp: entry.timestamp,
  };
  if (byteLength(JSON.stringify(candidate)) <= settings.maxBytes) return candidate;
  return {
    ...candidate,
    metadata: {
      ...candidate.metadata,
      payloadTruncated: true,
    },
    payload: undefined,
  };
}

function sanitizeRecord(
  record: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!record) return undefined;
  const sanitized = sanitizeValue(record);
  return sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
    ? sanitized as Record<string, unknown>
    : undefined;
}

function sanitizeValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nested]) => {
      if (isCredentialKey(key)) return [];
      return [[key, sanitizeValue(nested)]];
    }),
  );
}

function isCredentialKey(key: string): boolean {
  const normalized = key.toLowerCase().replaceAll('_', '').replaceAll('-', '');
  return [
    'credential',
    'credentialjson',
    'privatekey',
    'serviceaccount',
    'serviceaccountjson',
  ].includes(normalized);
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
      entry.error?.message,
    ].some((value) => value?.toLowerCase().includes(search));
  }).slice(0, request?.limit ?? entries.length);
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function reverseEntries(
  entries: ReadonlyArray<ActivityLogEntry>,
): ReadonlyArray<ActivityLogEntry> {
  return entries.map((_, index) => entries[entries.length - index - 1]!);
}

export function activityErrorFrom(error: unknown, fallback: string): ActivityLogError {
  if (error instanceof Error) return { message: error.message, name: error.name };
  return { message: fallback };
}
