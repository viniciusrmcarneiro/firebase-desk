/// <reference types="vite/client" />

interface DesktopHealthApi {
  readonly check: (request: { ping: 'ping'; sentAt: string; }) => Promise<{
    pong: 'pong';
    receivedAt: string;
    appVersion: string;
  }>;
}

interface DesktopApi {
  readonly health: DesktopHealthApi;
  readonly channels: ReadonlyArray<string>;
}

interface Window {
  readonly firebaseDesk: DesktopApi;
}
