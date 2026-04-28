import { GeoPoint, Timestamp } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';
import { runUserScript } from './runner.ts';
import type { ScriptRuntimeContext } from './runner.ts';

const rawRuntime = {
  auth: { getUser: async () => null },
  db: {
    batch: () => ({ kind: 'batch' }),
    docSnapshot: {
      id: 'ord_1',
      ref: { path: 'orders/ord_1' },
      data: () => ({
        paid: true,
        updatedAt: Timestamp.fromDate(new Date('2026-04-24T09:30:12.058Z')),
        deliveryLocation: new GeoPoint(-36.8485, 174.7633),
      }),
    },
    querySnapshot: null as unknown,
  },
  project: {
    id: 'emu',
    name: 'Local Emulator',
    projectId: 'demo-local',
    target: 'emulator' as const,
    emulator: { firestoreHost: '127.0.0.1:8080', authHost: '127.0.0.1:9099' },
    hasCredential: false,
    credentialEncrypted: null,
    createdAt: '2026-04-27T00:00:00.000Z',
  },
};
rawRuntime.db.querySnapshot = {
  docs: [rawRuntime.db.docSnapshot],
  size: 1,
  forEach: () => {},
};
const runtime = rawRuntime as unknown as ScriptRuntimeContext;

describe('runUserScript', () => {
  it('supports await, yield, return, console capture, and db.batch', async () => {
    const result = await runUserScript(
      `
      const batch = db.batch();
      console.log('batch', batch.kind);
      yield await Promise.resolve({
        ok: true,
        projectId: project.projectId,
        hasTimestamp: Boolean(admin.Timestamp),
      });
      return { done: true };
    `,
      runtime,
    );

    expect(result.errors).toEqual([]);
    expect(result.logs[0]?.message).toBe('batch batch');
    expect(result.stream).toEqual([
      expect.objectContaining({
        label: 'yield 1',
        value: { ok: true, projectId: 'demo-local', hasTimestamp: true },
      }),
    ]);
    expect(result.returnValue).toEqual({ done: true });
  });

  it('drains many yielded values without recursion depth growth', async () => {
    const result = await runUserScript(
      `
      for (let index = 0; index < 2000; index += 1) {
        yield index;
      }
      return 'done';
    `,
      runtime,
    );

    expect(result.errors).toEqual([]);
    expect(result.stream).toHaveLength(2000);
    expect(result.stream?.[1999]).toMatchObject({ label: 'yield 2000', value: 1999 });
    expect(result.returnValue).toBe('done');
  });

  it('reports syntax and thrown errors', async () => {
    await expect(runUserScript('const = broken', runtime)).resolves.toMatchObject({
      returnValue: null,
      errors: [expect.objectContaining({ name: 'SyntaxError' })],
    });
    await expect(runUserScript("throw new Error('boom')", runtime)).resolves.toMatchObject({
      returnValue: null,
      errors: [expect.objectContaining({ message: 'boom' })],
    });
  });

  it('keeps process and require unavailable in the vm globals', async () => {
    const result = await runUserScript(
      'return { processType: typeof process, requireType: typeof require };',
      runtime,
    );

    expect(result.returnValue).toEqual({
      processType: 'undefined',
      requireType: 'undefined',
    });
  });

  it('normalizes document and query snapshots without loading subcollections', async () => {
    const result = await runUserScript(
      `
      yield db.docSnapshot;
      return db.querySnapshot;
    `,
      runtime,
    );

    expect(result.stream?.[0]).toMatchObject({
      view: 'table',
      value: [{
        id: 'ord_1',
        path: 'orders/ord_1',
        hasSubcollections: false,
        data: {
          paid: true,
          updatedAt: { __type__: 'timestamp', value: '2026-04-24T09:30:12.058Z' },
          deliveryLocation: { __type__: 'geoPoint', latitude: -36.8485, longitude: 174.7633 },
        },
      }],
    });
    expect(result.returnValue).toEqual([
      expect.objectContaining({
        id: 'ord_1',
        hasSubcollections: false,
      }),
    ]);

    await expect(runUserScript('return [db.docSnapshot];', runtime)).resolves.toMatchObject({
      returnValue: [expect.objectContaining({ id: 'ord_1', path: 'orders/ord_1' })],
    });
  });
});
