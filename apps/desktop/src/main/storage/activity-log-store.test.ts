import type { ActivityLogEntry } from '@firebase-desk/repo-contracts';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ActivityLogStore } from './activity-log-store.ts';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

describe('ActivityLogStore', () => {
  it('appends and lists newest first', async () => {
    const dir = await makeTempDir();
    const store = new ActivityLogStore(dir);

    await store.append(entry('one', '2026-04-29T00:00:00.000Z'), 1024 * 1024);
    await store.append(entry('two', '2026-04-29T00:00:01.000Z'), 1024 * 1024);

    await expect(store.list()).resolves.toMatchObject([
      { id: 'two' },
      { id: 'one' },
    ]);
  });

  it('prunes oldest entries by byte budget', async () => {
    const dir = await makeTempDir();
    const store = new ActivityLogStore(dir);
    await store.append(entry('one', '2026-04-29T00:00:00.000Z', 'x'.repeat(200)), 1024 * 1024);
    await store.append(entry('two', '2026-04-29T00:00:01.000Z', 'x'.repeat(200)), 1024 * 1024);

    await store.prune(
      Buffer.byteLength(
        `${JSON.stringify(entry('two', '2026-04-29T00:00:01.000Z', 'x'.repeat(200)))}\n`,
        'utf8',
      ),
    );

    await expect(store.list()).resolves.toMatchObject([{ id: 'two' }]);
  });

  it('skips invalid jsonl lines and clears', async () => {
    const dir = await makeTempDir();
    await writeFile(
      join(dir, 'activity-log.jsonl'),
      `bad json\n${JSON.stringify(entry('valid', '2026-04-29T00:00:00.000Z'))}\n`,
      'utf8',
    );
    const store = new ActivityLogStore(dir);

    await expect(store.list()).resolves.toMatchObject([{ id: 'valid' }]);

    await store.clear();

    await expect(store.list()).resolves.toEqual([]);
  });

  it('exports JSONL', async () => {
    const dir = await makeTempDir();
    const store = new ActivityLogStore(dir);
    const exportPath = join(dir, 'export.jsonl');

    await store.exportTo(exportPath, [entry('one', '2026-04-29T00:00:00.000Z')]);

    expect(await readFile(exportPath, 'utf8')).toContain('"id":"one"');
  });
});

async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'firebase-desk-activity-'));
  tempDirs.push(dir);
  return dir;
}

function entry(id: string, timestamp: string, summary = 'Saved'): ActivityLogEntry {
  return {
    action: 'Save document',
    area: 'firestore',
    id,
    status: 'success',
    summary,
    timestamp,
  };
}
