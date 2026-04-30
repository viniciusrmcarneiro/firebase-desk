import type { ActivityLogStatus } from '@firebase-desk/repo-contracts';

export type CommandSource = 'scheduler' | 'user';
export type CommandNotifyPolicy = 'all' | 'issues-only' | 'none';
export type CommandCancellationPolicy = 'allow-concurrent' | 'cancel-previous' | 'skip-if-running';

export interface AppCoreCommandOptions {
  readonly cancellationPolicy?: CommandCancellationPolicy | undefined;
  readonly notifyPolicy?: CommandNotifyPolicy | undefined;
  readonly serializationKey?: string | undefined;
  readonly source?: CommandSource | undefined;
  readonly visible?: boolean | undefined;
}

export interface NormalizedAppCoreCommandOptions {
  readonly cancellationPolicy: CommandCancellationPolicy;
  readonly notifyPolicy: CommandNotifyPolicy;
  readonly serializationKey: string | null;
  readonly source: CommandSource;
  readonly visible: boolean;
}

export function normalizeCommandOptions(
  options: AppCoreCommandOptions | undefined,
): NormalizedAppCoreCommandOptions {
  return {
    cancellationPolicy: options?.cancellationPolicy ?? 'allow-concurrent',
    notifyPolicy: options?.notifyPolicy ?? 'all',
    serializationKey: options?.serializationKey?.trim() || null,
    source: options?.source ?? 'user',
    visible: options?.visible ?? true,
  };
}

export function commandActivityMetadata(
  options: AppCoreCommandOptions | undefined,
): Record<string, unknown> {
  if (!options) return {};
  const normalized = normalizeCommandOptions(options);
  return {
    command: {
      cancellationPolicy: normalized.cancellationPolicy,
      notifyPolicy: normalized.notifyPolicy,
      serializationKey: normalized.serializationKey,
      source: normalized.source,
      visible: normalized.visible,
    },
  };
}

export function shouldNotifyForCommandStatus(
  options: AppCoreCommandOptions | undefined,
  status: ActivityLogStatus,
): boolean {
  const policy = normalizeCommandOptions(options).notifyPolicy;
  if (policy === 'none') return false;
  if (policy === 'issues-only') return status === 'failure' || status === 'conflict';
  return true;
}
