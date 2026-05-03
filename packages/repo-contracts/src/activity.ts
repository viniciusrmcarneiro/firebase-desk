export const ACTIVITY_LOG_AREAS = [
  'app',
  'auth',
  'firestore',
  'js-query',
  'projects',
  'settings',
  'workspace',
] as const;

export type ActivityLogArea = (typeof ACTIVITY_LOG_AREAS)[number];

export const ACTIVITY_LOG_STATUSES = ['cancelled', 'conflict', 'failure', 'success'] as const;

export type ActivityLogStatus = (typeof ACTIVITY_LOG_STATUSES)[number];

export const ACTIVITY_LOG_DETAIL_MODES = ['metadata', 'fullPayload'] as const;

export type ActivityLogDetailMode = (typeof ACTIVITY_LOG_DETAIL_MODES)[number];

export const DEFAULT_ACTIVITY_LOG_MAX_BYTES = 5 * 1024 * 1024;

export interface ActivityLogSettings {
  readonly detailMode: ActivityLogDetailMode;
  readonly enabled: boolean;
  readonly maxBytes: number;
}

export const DEFAULT_ACTIVITY_LOG_SETTINGS: ActivityLogSettings = {
  detailMode: 'metadata',
  enabled: true,
  maxBytes: DEFAULT_ACTIVITY_LOG_MAX_BYTES,
};

export interface ActivityLogTarget {
  readonly connectionId?: string | undefined;
  readonly label?: string | undefined;
  readonly path?: string | undefined;
  readonly projectId?: string | undefined;
  readonly type:
    | 'auth-user'
    | 'firestore-collection'
    | 'firestore-document'
    | 'firestore-query'
    | 'project'
    | 'script'
    | 'settings'
    | 'workspace';
  readonly uid?: string | undefined;
}

export interface ActivityLogError {
  readonly message: string;
  readonly name?: string | undefined;
}

export interface ActivityLogEntry {
  readonly action: string;
  readonly area: ActivityLogArea;
  readonly durationMs?: number | undefined;
  readonly error?: ActivityLogError | undefined;
  readonly id: string;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly payload?: Record<string, unknown> | undefined;
  readonly status: ActivityLogStatus;
  readonly summary: string;
  readonly target?: ActivityLogTarget | undefined;
  readonly timestamp: string;
}

export interface ActivityLogAppendInput {
  readonly action: string;
  readonly area: ActivityLogArea;
  readonly durationMs?: number | undefined;
  readonly error?: ActivityLogError | undefined;
  readonly metadata?: Record<string, unknown> | undefined;
  readonly payload?: Record<string, unknown> | undefined;
  readonly status: ActivityLogStatus;
  readonly summary: string;
  readonly target?: ActivityLogTarget | undefined;
}

export interface ActivityLogListRequest {
  readonly area?: ActivityLogArea | 'all' | undefined;
  readonly limit?: number | undefined;
  readonly search?: string | undefined;
  readonly status?: ActivityLogStatus | 'all' | undefined;
}

export interface ActivityLogExportResult {
  readonly canceled: boolean;
  readonly filePath?: string | undefined;
}

export interface ActivityLogRepository {
  append(input: ActivityLogAppendInput): Promise<ActivityLogEntry>;
  clear(): Promise<void>;
  export(request?: ActivityLogListRequest): Promise<ActivityLogExportResult>;
  list(request?: ActivityLogListRequest): Promise<ReadonlyArray<ActivityLogEntry>>;
}
