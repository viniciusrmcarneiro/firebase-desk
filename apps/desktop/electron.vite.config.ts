import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

const __dirname = dirname(fileURLToPath(import.meta.url));
const monacoEditorPluginFactory =
  (monacoEditorPlugin as unknown as { default?: typeof monacoEditorPlugin; }).default
    ?? monacoEditorPlugin;

export default defineConfig({
  main: {
    build: {
      outDir: '.build/out/main',
      lib: {
        entry: {
          index: resolve(__dirname, 'src/main/index.ts'),
          'script-runner-worker': resolve(__dirname, 'src/main/script-runner-worker.ts'),
        },
        formats: ['es'],
      },
      rollupOptions: {
        external: ['electron', /^node:/],
      },
    },
  },
  preload: {
    build: {
      externalizeDeps: false,
      outDir: '.build/out/preload',
      lib: { entry: resolve(__dirname, 'src/preload/index.ts'), formats: ['cjs'] },
      rollupOptions: {
        external: ['electron'],
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    css: {
      postcss: resolve(__dirname, 'postcss.config.cjs'),
    },
    plugins: [
      react(),
      monacoEditorPluginFactory({
        languageWorkers: [],
        publicPath: 'monacoeditorwork',
        customDistPath: (_root, buildOutDir) => resolve(buildOutDir, 'monacoeditorwork'),
        customWorkers: [
          { label: 'editorWorkerService', entry: 'monaco-editor/esm/vs/editor/editor.worker.js' },
          { label: 'json', entry: 'monaco-editor/esm/vs/language/json/json.worker.js' },
          { label: 'typescript', entry: 'monaco-editor/esm/vs/language/typescript/ts.worker.js' },
        ],
      }),
    ],
    build: {
      outDir: resolve(__dirname, '.build/out/renderer'),
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html'),
      },
    },
  },
});
