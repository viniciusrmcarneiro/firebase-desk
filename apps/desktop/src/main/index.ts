import { app, BrowserWindow } from 'electron';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from './ipc/registry.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const userDataDir = process.env['FIREBASE_DESK_USER_DATA_DIR'];

if (userDataDir) app.setPath('userData', userDataDir);

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    title: 'Firebase Desk',
    webPreferences: {
      preload: resolve(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (process.env['ELECTRON_RENDERER_URL']) {
    await window.loadURL(process.env['ELECTRON_RENDERER_URL']);
  } else {
    await window.loadFile(resolve(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
