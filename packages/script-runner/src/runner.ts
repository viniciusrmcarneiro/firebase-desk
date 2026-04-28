import type {
  ScriptLogEntry,
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
import { normalizeReturnValue, normalizeStreamItem } from './normalize.ts';

export interface ScriptRuntimeContext {
  readonly auth: Auth;
  readonly db: Firestore;
  readonly project: ProjectSummary;
}

export async function runUserScript(
  source: string,
  context: ScriptRuntimeContext,
): Promise<ScriptRunResult> {
  const startedAt = Date.now();
  const logs: ScriptLogEntry[] = [];
  const stream: ScriptStreamItem[] = [];

  try {
    const generator = createUserGenerator(source, context, logs);
    const returnValue = await drainGenerator(generator, stream, 1);
    return {
      returnValue: normalizeReturnValue(returnValue),
      stream,
      logs,
      errors: [],
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      returnValue: null,
      stream,
      logs,
      errors: [scriptError(error)],
      durationMs: Date.now() - startedAt,
    };
  }
}

async function drainGenerator(
  generator: AsyncGenerator<unknown, unknown, unknown>,
  stream: ScriptStreamItem[],
  initialYieldIndex: number,
): Promise<unknown> {
  let yieldIndex = initialYieldIndex;
  while (true) {
    const next = await generator.next();
    if (next.done) return next.value;
    const item = normalizeStreamItem(next.value, yieldIndex);
    if (item) stream.push(item);
    yieldIndex += 1;
  }
}

function createUserGenerator(
  source: string,
  runtime: ScriptRuntimeContext,
  logs: ScriptLogEntry[],
): AsyncGenerator<unknown, unknown, unknown> {
  const script = new Script(wrappedSource(source), {
    filename: 'firebase-desk-script.js',
  });
  const vmContext = createContext({
    admin: adminFacade(runtime),
    auth: runtime.auth,
    console: consoleFacade(logs),
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

function consoleFacade(logs: ScriptLogEntry[]): Console {
  const write = (level: ScriptLogEntry['level'], args: unknown[]) => {
    logs.push({
      level,
      message: format(...args),
      timestamp: new Date().toISOString(),
    });
  };
  return {
    log: (...args: unknown[]) => write('log', args),
    info: (...args: unknown[]) => write('info', args),
    warn: (...args: unknown[]) => write('warn', args),
    error: (...args: unknown[]) => write('error', args),
  } as Console;
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
