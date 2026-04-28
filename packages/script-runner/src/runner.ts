import type {
  ScriptLogEntry,
  ScriptRunError,
  ScriptRunEvent,
  ScriptRunResult,
  ScriptStreamItem,
} from '@firebase-desk/repo-contracts';
import type { ProjectSummary } from '@firebase-desk/repo-contracts';
import type { Auth } from 'firebase-admin/auth';
import {
  FieldPath,
  FieldValue,
  type Firestore,
  GeoPoint,
  Timestamp,
} from 'firebase-admin/firestore';
import { format } from 'node:util';
import { createContext, Script } from 'node:vm';
import {
  normalizeReturnStreamItem,
  normalizeReturnValue,
  normalizeStreamItem,
} from './normalize.ts';

export interface ScriptRuntimeContext {
  readonly auth: Auth;
  readonly db: Firestore;
  readonly project: ProjectSummary;
}

export interface ScriptRunEventSink {
  readonly runId: string;
  readonly onEvent: (event: ScriptRunEvent) => void;
}

type ScriptRunEventPayload =
  | { readonly type: 'output'; readonly item: ScriptStreamItem; }
  | { readonly type: 'log'; readonly log: ScriptLogEntry; }
  | { readonly type: 'error'; readonly error: ScriptRunError; };

export async function runUserScript(
  source: string,
  context: ScriptRuntimeContext,
  events?: ScriptRunEventSink,
): Promise<ScriptRunResult> {
  const startedAt = Date.now();
  const logs: ScriptLogEntry[] = [];
  const stream: ScriptStreamItem[] = [];

  try {
    const generator = createUserGenerator(source, context, logs, events);
    const rawReturnValue = await drainGenerator(generator, stream, 1, events);
    const returnItem = normalizeReturnStreamItem(rawReturnValue);
    if (returnItem) {
      stream.push(returnItem);
      emitRunEvent(events, { type: 'output', item: returnItem });
    }
    return {
      returnValue: normalizeReturnValue(rawReturnValue),
      stream,
      logs,
      errors: [],
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    const scriptRunError = scriptError(error);
    emitRunEvent(events, { type: 'error', error: scriptRunError });
    return {
      returnValue: null,
      stream,
      logs,
      errors: [scriptRunError],
      durationMs: Date.now() - startedAt,
    };
  }
}

async function drainGenerator(
  generator: AsyncGenerator<unknown, unknown, unknown>,
  stream: ScriptStreamItem[],
  initialYieldIndex: number,
  events?: ScriptRunEventSink,
): Promise<unknown> {
  let yieldIndex = initialYieldIndex;
  while (true) {
    // eslint-disable-next-line no-await-in-loop -- async generator yields must be consumed sequentially.
    const next = await generator.next();
    if (next.done) return next.value;
    const item = normalizeStreamItem(next.value, yieldIndex);
    if (item) {
      stream.push(item);
      emitRunEvent(events, { type: 'output', item });
    }
    yieldIndex += 1;
  }
}

function createUserGenerator(
  source: string,
  runtime: ScriptRuntimeContext,
  logs: ScriptLogEntry[],
  events?: ScriptRunEventSink,
): AsyncGenerator<unknown, unknown, unknown> {
  const script = new Script(wrappedSource(source), {
    filename: 'firebase-desk-script.js',
  });
  const vmContext = createContext({
    admin: adminFacade(runtime),
    auth: runtime.auth,
    console: consoleFacade(logs, events),
    db: runtime.db,
    project: {
      id: runtime.project.id,
      projectId: runtime.project.projectId,
      name: runtime.project.name,
      target: runtime.project.target,
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  });
  const generatorFactory = script.runInContext(vmContext) as () => AsyncGenerator<
    unknown,
    unknown,
    unknown
  >;
  const generator = generatorFactory();
  if (!isAsyncGenerator(generator)) throw new Error('Script did not produce an async generator.');
  return generator;
}

function wrappedSource(source: string): string {
  return `(async function* __firebaseDeskScript__() {\n'use strict';\n${source}\n})`;
}

function consoleFacade(logs: ScriptLogEntry[], events?: ScriptRunEventSink): Console {
  const write = (level: ScriptLogEntry['level'], args: unknown[]) => {
    const log = {
      level,
      message: format(...args),
      timestamp: new Date().toISOString(),
    };
    logs.push(log);
    emitRunEvent(events, { type: 'log', log });
  };
  return {
    log: (...args: unknown[]) => write('log', args),
    info: (...args: unknown[]) => write('info', args),
    warn: (...args: unknown[]) => write('warn', args),
    error: (...args: unknown[]) => write('error', args),
  } as Console;
}

function emitRunEvent(
  events: ScriptRunEventSink | undefined,
  event: ScriptRunEventPayload,
): void {
  if (!events) return;
  events.onEvent({ ...event, runId: events.runId });
}

function adminFacade(runtime: ScriptRuntimeContext) {
  const firestore = () => runtime.db;
  Object.assign(firestore, {
    FieldPath,
    FieldValue,
    GeoPoint,
    Timestamp,
  });
  return Object.freeze({
    auth: () => runtime.auth,
    FieldPath,
    FieldValue,
    firestore,
    GeoPoint,
    Timestamp,
  });
}

function scriptError(error: unknown): ScriptRunResult['errors'][number] {
  if (isErrorLike(error)) {
    const typed = error;
    return {
      ...(typed.code ? { code: typed.code } : {}),
      ...(typed.name ? { name: typed.name } : {}),
      message: typed.message,
      ...(typed.stack ? { stack: typed.stack } : {}),
    };
  }
  return { name: 'Error', message: String(error) };
}

function isErrorLike(
  value: unknown,
): value is {
  readonly code?: string;
  readonly message: string;
  readonly name?: string;
  readonly stack?: string;
} {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { readonly message?: unknown; }).message === 'string';
}

function isAsyncGenerator(
  value: unknown,
): value is AsyncGenerator<unknown, unknown, unknown> {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { next?: unknown; })['next'] === 'function';
}
