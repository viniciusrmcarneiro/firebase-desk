// @ts-check

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, '../..');
const desktopDirectory = resolve(workspaceRoot, 'apps/desktop');
const releaseDirectory = resolve(desktopDirectory, 'release');
const smokeTimeoutMs = Number.parseInt(
  process.env['FIREBASE_DESK_PACKAGED_SMOKE_MS'] ?? '8000',
  10,
);

/**
 * @param {string} directory
 * @param {string} executableName
 * @returns {string | undefined}
 */
function findNestedExecutable(directory, executableName) {
  if (!existsSync(directory)) return undefined;

  const entries = readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);
    if (entry.isFile() && entry.name === executableName) return entryPath;
    if (entry.isDirectory()) {
      const nestedPath = findNestedExecutable(entryPath, executableName);
      if (nestedPath) return nestedPath;
    }
  }

  return undefined;
}

/**
 * @param {readonly string[]} paths
 * @returns {string | undefined}
 */
function firstExisting(paths) {
  return paths.find((candidatePath) => existsSync(candidatePath));
}

/** @returns {string} */
function resolvePackagedExecutable() {
  const explicitPath = process.env['FIREBASE_DESK_PACKAGED_BIN'];
  if (explicitPath) return explicitPath;

  if (process.platform === 'darwin') {
    const macExecutable = firstExisting([
      resolve(releaseDirectory, 'mac/Firebase Desk.app/Contents/MacOS/Firebase Desk'),
      resolve(releaseDirectory, 'mac-arm64/Firebase Desk.app/Contents/MacOS/Firebase Desk'),
      resolve(releaseDirectory, 'mac-universal/Firebase Desk.app/Contents/MacOS/Firebase Desk'),
    ]) ?? findNestedExecutable(releaseDirectory, 'Firebase Desk');
    if (macExecutable && statSync(macExecutable).isFile()) return macExecutable;
  }

  if (process.platform === 'win32') {
    const windowsExecutable = firstExisting([
      resolve(releaseDirectory, 'win-unpacked/Firebase Desk.exe'),
      resolve(releaseDirectory, 'win-ia32-unpacked/Firebase Desk.exe'),
      resolve(releaseDirectory, 'win-arm64-unpacked/Firebase Desk.exe'),
    ]) ?? findNestedExecutable(releaseDirectory, 'Firebase Desk.exe');
    if (windowsExecutable && statSync(windowsExecutable).isFile()) return windowsExecutable;
  }

  const linuxExecutable = firstExisting([
    resolve(releaseDirectory, 'linux-unpacked/firebase-desk'),
    resolve(releaseDirectory, 'linux-arm64-unpacked/firebase-desk'),
  ]) ?? findNestedExecutable(releaseDirectory, 'firebase-desk');
  if (linuxExecutable && statSync(linuxExecutable).isFile()) return linuxExecutable;

  throw new Error(`Could not find packaged Firebase Desk executable under ${releaseDirectory}`);
}

/**
 * @param {string} executablePath
 * @returns {string}
 */
function resolvePackagedResourcesDirectory(executablePath) {
  if (process.platform === 'darwin') {
    return resolve(dirname(executablePath), '..', 'Resources');
  }

  return resolve(dirname(executablePath), 'resources');
}

/**
 * @param {string} executablePath
 * @returns {void}
 */
function assertPackagedResources(executablePath) {
  const resourcesDirectory = resolvePackagedResourcesDirectory(executablePath);
  const appArchivePath = resolve(resourcesDirectory, 'app.asar');

  if (!existsSync(resourcesDirectory) || !statSync(resourcesDirectory).isDirectory()) {
    throw new Error(`Packaged resources directory is missing: ${resourcesDirectory}`);
  }

  if (!existsSync(appArchivePath) || !statSync(appArchivePath).isFile()) {
    throw new Error(`Packaged app archive is missing: ${appArchivePath}`);
  }
}

/** @returns {NodeJS.ProcessEnv} */
function createSmokeEnvironment() {
  return {
    ...process.env,
    ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
    FIREBASE_AUTH_EMULATOR_HOST: process.env['FIREBASE_AUTH_EMULATOR_HOST'] ?? '127.0.0.1:9099',
    FIRESTORE_EMULATOR_HOST: process.env['FIRESTORE_EMULATOR_HOST'] ?? '127.0.0.1:8080',
    GCLOUD_PROJECT: process.env['GCLOUD_PROJECT'] ?? 'demo-local',
  };
}

/**
 * @param {string} currentOutput
 * @param {Buffer} chunk
 * @returns {string}
 */
function appendBoundedOutput(currentOutput, chunk) {
  const nextOutput = `${currentOutput}${chunk.toString()}`;
  return nextOutput.length > 4000 ? nextOutput.slice(nextOutput.length - 4000) : nextOutput;
}

/**
 * @param {import('node:child_process').ChildProcess} childProcess
 * @returns {Promise<void>}
 */
function stopProcess(childProcess) {
  if (childProcess.exitCode !== null || childProcess.signalCode !== null) return Promise.resolve();

  childProcess.kill('SIGTERM');
  return /** @type {Promise<void>} */ (
    new Promise((resolvePromise) => {
      const forceTimer = setTimeout(() => {
        childProcess.kill('SIGKILL');
        resolvePromise();
      }, 2000);

      childProcess.once('exit', () => {
        clearTimeout(forceTimer);
        resolvePromise();
      });
    })
  );
}

/** @returns {Promise<void>} */
async function runSmoke() {
  const executablePath = resolvePackagedExecutable();
  assertPackagedResources(executablePath);
  console.log(`Launching packaged app: ${executablePath}`);

  let stderrOutput = '';
  let stdoutOutput = '';
  let settled = false;
  const childProcess = spawn(executablePath, [], {
    cwd: desktopDirectory,
    env: createSmokeEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  childProcess.stdout.on('data', (chunk) => {
    stdoutOutput = appendBoundedOutput(stdoutOutput, chunk);
  });
  childProcess.stderr.on('data', (chunk) => {
    stderrOutput = appendBoundedOutput(stderrOutput, chunk);
  });

  await /** @type {Promise<void>} */ (
    new Promise((resolvePromise, rejectPromise) => {
      const readyTimer = setTimeout(async () => {
        settled = true;
        await stopProcess(childProcess);
        resolvePromise();
      }, smokeTimeoutMs);

      childProcess.once('error', (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(readyTimer);
        rejectPromise(error);
      });

      childProcess.once('exit', (code, signal) => {
        if (settled) return;
        settled = true;
        clearTimeout(readyTimer);
        rejectPromise(
          new Error(
            `Packaged app exited before ${smokeTimeoutMs}ms (code=${code}, signal=${signal}).\nSTDOUT:\n${stdoutOutput}\nSTDERR:\n${stderrOutput}`,
          ),
        );
      });
    })
  );

  console.log(`Packaged app stayed alive for ${smokeTimeoutMs}ms.`);
}

await runSmoke();
