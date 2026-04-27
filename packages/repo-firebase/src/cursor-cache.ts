import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

export interface FirestoreCursorCacheOptions {
  readonly maxEntries?: number;
  readonly ttlMs?: number;
}

interface CursorEntry {
  readonly connectionId: string;
  readonly createdAt: number;
  readonly snapshot: QueryDocumentSnapshot;
}

const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_TTL_MS = 10 * 60 * 1000;

export class FirestoreCursorCache {
  private readonly entries = new Map<string, CursorEntry>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(options: FirestoreCursorCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  }

  create(connectionId: string, snapshot: QueryDocumentSnapshot): string {
    this.pruneExpired();
    const token = randomUUID();
    this.entries.set(token, { connectionId, createdAt: Date.now(), snapshot });
    this.pruneLru();
    return token;
  }

  get(connectionId: string, token: string): QueryDocumentSnapshot | null {
    const entry = this.entries.get(token);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.entries.delete(token);
      return null;
    }
    if (entry.connectionId !== connectionId) return null;
    this.entries.delete(token);
    this.entries.set(token, entry);
    return entry.snapshot;
  }

  invalidateConnection(connectionId: string): void {
    for (const [token, entry] of this.entries) {
      if (entry.connectionId === connectionId) this.entries.delete(token);
    }
  }

  clear(): void {
    this.entries.clear();
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [token, entry] of this.entries) {
      if (now - entry.createdAt > this.ttlMs) this.entries.delete(token);
    }
  }

  private pruneLru(): void {
    while (this.entries.size > this.maxEntries) {
      const token = this.entries.keys().next().value as string | undefined;
      if (!token) return;
      this.entries.delete(token);
    }
  }
}
