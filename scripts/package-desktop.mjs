import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const desktopDirectory = resolve(scriptDirectory, '../apps/desktop');
const environment = { ...process.env, RELEASE_CHANNEL: process.env.RELEASE_CHANNEL ?? 'local' };

function runPnpm(args) {
  const result = spawnSync('pnpm', args, {
    cwd: desktopDirectory,
    env: environment,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

runPnpm(['run', 'build']);
runPnpm(['exec', 'electron-builder', '--config', 'electron-builder.yml']);
