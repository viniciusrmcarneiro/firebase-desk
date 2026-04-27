import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await writeStringAtomic(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function writeStringAtomic(filePath: string, value: string): Promise<void> {
  await writeAtomic(filePath, value, 'utf8');
}

export async function writeBufferAtomic(filePath: string, value: Buffer): Promise<void> {
  await writeAtomic(filePath, value);
}

async function writeAtomic(
  filePath: string,
  value: Buffer | string,
  encoding?: BufferEncoding,
): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    if (typeof value === 'string') {
      await writeFile(tmpPath, value, encoding);
    } else {
      await writeFile(tmpPath, value);
    }
    await rename(tmpPath, filePath);
  } catch (error) {
    await rm(tmpPath, { force: true }).catch(() => undefined);
    throw error;
  }
}
