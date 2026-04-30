import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('renderer CSP', () => {
  it('declares a renderer content security policy compatible with Monaco workers', async () => {
    const html = await readFile(join(process.cwd(), 'src/renderer/index.html'), 'utf8');

    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("default-src 'self'");
    expect(html).toContain("worker-src 'self' blob:");
    expect(html).toContain("style-src 'self' 'unsafe-inline'");
  });
});
