import { ActivityLogEntrySchema } from '@firebase-desk/ipc-schemas';
import type { ActivityLogEntry } from '@firebase-desk/repo-contracts';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export class ActivityLogStore {
  private readonly filePath: string;
  private mutationQueue: Promise<void> = Promise.resolve();

  constructor(userDataPath: string) {
    this.filePath = join(userDataPath, 'activity-log.jsonl');
  }

  async append(entry: ActivityLogEntry, maxBytes: number): Promise<void> {
    await this.runMutation(async () => {
      const entries = [...await this.readEntriesOldestFirst(), entry];
      await this.writeEntries(pruneEntries(entries, maxBytes));
    });
  }

  async clear(): Promise<void> {
    await this.runMutation(async () => {
      try {
        await unlink(this.filePath);
      } catch (error) {
        if (!isNotFound(error)) throw error;
      }
    });
  }

  async exportTo(filePath: string, entries?: ReadonlyArray<ActivityLogEntry>): Promise<void> {
    await this.waitForMutations();
    await writeFile(filePath, jsonl(entries ?? await this.readEntriesOldestFirst()), 'utf8');
  }

  async list(): Promise<ReadonlyArray<ActivityLogEntry>> {
    await this.waitForMutations();
    return reverseEntries(await this.readEntriesOldestFirst());
  }

  async prune(maxBytes: number): Promise<void> {
    await this.runMutation(async () => {
      await this.writeEntries(pruneEntries(await this.readEntriesOldestFirst(), maxBytes));
    });
  }

  private async readEntriesOldestFirst(): Promise<ReadonlyArray<ActivityLogEntry>> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      return raw.split('\n').flatMap((line) => {
        if (!line.trim()) return [];
        try {
          const parsed = ActivityLogEntrySchema.safeParse(JSON.parse(line) as unknown);
          return parsed.success ? [parsed.data] : [];
        } catch {
          return [];
        }
      });
    } catch (error) {
      if (isNotFound(error)) return [];
      throw error;
    }
  }

  private async writeEntries(entries: ReadonlyArray<ActivityLogEntry>): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    const content = entries.map((entry) => JSON.stringify(entry)).join('\n');
    await writeFile(this.filePath, content ? `${content}\n` : '', 'utf8');
  }

  private runMutation(operation: () => Promise<void>): Promise<void> {
    const next = this.mutationQueue.then(operation, operation);
    this.mutationQueue = next.catch(() => undefined);
    return next;
  }

  private async waitForMutations(): Promise<void> {
    await this.mutationQueue.catch(() => undefined);
  }
}

function pruneEntries(
  entries: ReadonlyArray<ActivityLogEntry>,
  maxBytes: number,
): ReadonlyArray<ActivityLogEntry> {
  const sizes = entries.map((entry) => byteLength(`${JSON.stringify(entry)}\n`));
  let totalBytes = sizes.reduce((total, size) => total + size, 0);
  let startIndex = 0;
  while (startIndex < entries.length && totalBytes > maxBytes) {
    totalBytes -= sizes[startIndex]!;
    startIndex += 1;
  }
  return entries.slice(startIndex);
}

function jsonl(entries: ReadonlyArray<ActivityLogEntry>): string {
  const content = entries.map((entry) => JSON.stringify(entry)).join('\n');
  return content ? `${content}\n` : '';
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT');
}

function reverseEntries(
  entries: ReadonlyArray<ActivityLogEntry>,
): ReadonlyArray<ActivityLogEntry> {
  return entries.map((_, index) => entries[entries.length - index - 1]!);
}
