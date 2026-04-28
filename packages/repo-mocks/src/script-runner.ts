import { encode } from '@firebase-desk/data-format';
import type {
  ScriptRunEventListener,
  ScriptRunnerRepository,
  ScriptRunRequest,
  ScriptRunResult,
} from '@firebase-desk/repo-contracts';
import { COLLECTIONS, type FixtureDocument } from './fixtures/index.ts';

export class MockScriptRunnerRepository implements ScriptRunnerRepository {
  private readonly listeners = new Set<ScriptRunEventListener>();

  async run(request: ScriptRunRequest): Promise<ScriptRunResult> {
    const startedAt = Date.now();
    const source = request.source.toLowerCase();
    const hasError = source.includes('throw');
    const orders = docsFor('orders').filter((doc) => doc.data.status === 'paid').slice(0, 2);
    const customers = docsFor('customers');
    const returnedOrders = orders.map((doc) => resultDocument('orders', doc));
    const logs = [
      {
        level: 'info' as const,
        message: `Firebase Admin SDK ready for ${request.connectionId}`,
        timestamp: new Date().toISOString(),
      },
    ];
    if (source.includes('empty')) {
      const result: ScriptRunResult = {
        returnValue: null,
        stream: [],
        logs: [
          ...logs,
          {
            level: 'info',
            message: 'Script completed without renderable data',
            timestamp: new Date().toISOString(),
          },
        ],
        errors: [],
        durationMs: Date.now() - startedAt,
      };
      this.emitResultEvents(request.runId, result);
      return result;
    }
    if (source.includes('plain')) {
      const value = {
        ok: true,
        connectionId: request.connectionId,
        summary: { paidOrders: returnedOrders.length, customers: customers.length },
      };
      const result: ScriptRunResult = {
        returnValue: value,
        stream: [{
          id: 'yield-plain-object',
          label: 'yield plain object',
          badge: 'object',
          view: 'json',
          value,
        }],
        logs,
        errors: [],
        durationMs: Date.now() - startedAt,
      };
      this.emitResultEvents(request.runId, result);
      return result;
    }
    if (source.includes('array')) {
      const value = orders.map((doc) => doc.data.status);
      const result: ScriptRunResult = {
        returnValue: value,
        stream: [{
          id: 'yield-array',
          label: 'yield array',
          badge: `${value.length} items`,
          view: 'json',
          value,
        }],
        logs,
        errors: [],
        durationMs: Date.now() - startedAt,
      };
      this.emitResultEvents(request.runId, result);
      return result;
    }
    if (source.includes('document')) {
      const value = orders[0] ? resultDocument('orders', orders[0]) : null;
      const result: ScriptRunResult = {
        returnValue: value,
        stream: [{
          id: 'yield-document-like-value',
          label: 'yield document-like value',
          badge: value?.path ?? 'none',
          view: 'json',
          value,
        }],
        logs,
        errors: [],
        durationMs: Date.now() - startedAt,
      };
      this.emitResultEvents(request.runId, result);
      return result;
    }
    const result: ScriptRunResult = {
      returnValue: hasError ? null : returnedOrders,
      stream: hasError
        ? []
        : [
          {
            id: 'yield-document-snapshot',
            label: 'yield DocumentSnapshot',
            badge: `orders/${orders[0]?.id ?? 'unknown'}`,
            view: 'json',
            value: orders[0] ? resultDocument('orders', orders[0]) : null,
          },
          {
            id: 'yield-collection-reference',
            label: 'yield CollectionReference',
            badge: 'customers',
            view: 'table',
            value: customers.map((doc) => resultDocument('customers', doc)),
          },
          {
            id: 'yield-query-snapshot',
            label: 'yield QuerySnapshot',
            badge: 'orders where status == paid',
            view: 'table',
            value: returnedOrders,
          },
          {
            id: 'return-query-snapshot',
            label: 'return QuerySnapshot',
            badge: 'final return',
            view: 'json',
            value: returnedOrders,
          },
        ],
      logs: [
        ...logs,
        {
          level: 'log',
          message: `Fetched ${orders.length} orders`,
          timestamp: new Date().toISOString(),
        },
        {
          level: 'info',
          message: 'Appended yield DocumentSnapshot to result stream',
          timestamp: new Date().toISOString(),
        },
        {
          level: 'info',
          message: 'Appended yield QuerySnapshot to result stream',
          timestamp: new Date().toISOString(),
        },
        {
          level: hasError ? 'warn' : 'info',
          message: hasError
            ? 'Simulated throw detected'
            : 'Appended return QuerySnapshot to result stream',
          timestamp: new Date().toISOString(),
        },
      ],
      errors: hasError
        ? [{
          name: 'FirebaseError',
          code: 'permission-denied',
          message: 'Mock script error',
          stack: 'Error: Mock script error\n    at mock-runner:1:1',
        }]
        : [],
      durationMs: Date.now() - startedAt,
    };
    this.emitResultEvents(request.runId, result);
    return result;
  }

  async cancel(_runId: string): Promise<void> {}

  subscribe(listener: ScriptRunEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitResultEvents(runId: string, result: ScriptRunResult): void {
    for (const log of result.logs) this.emit({ type: 'log', runId, log });
    for (const item of result.stream ?? []) this.emit({ type: 'output', runId, item });
    for (const error of result.errors) this.emit({ type: 'error', runId, error });
    this.emit({ type: 'complete', runId, result });
  }

  private emit(event: Parameters<ScriptRunEventListener>[0]): void {
    for (const listener of this.listeners) listener(event);
  }
}

function docsFor(path: string): ReadonlyArray<FixtureDocument> {
  return COLLECTIONS.find((collection) => collection.path === path)?.docs ?? [];
}

function resultDocument(collectionPath: string, document: FixtureDocument) {
  return {
    id: document.id,
    path: `${collectionPath}/${document.id}`,
    data: encode(document.data as never) as Record<string, unknown>,
  };
}
