import { spawnSync } from 'node:child_process';

const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const environment = { ...process.env, RELEASE_CHANNEL: process.env.RELEASE_CHANNEL ?? 'local' };

function run(command, args) {
  const result = spawnSync(command, args, {
    env: environment,
    shell: false,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(packageManager, ['run', 'build']);
run(packageManager, ['exec', 'electron-builder', '--config', 'electron-builder.yml']);
