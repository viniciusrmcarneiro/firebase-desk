import { baseVitestConfig } from '@firebase-desk/config-vitest';
import { mergeConfig } from 'vitest/config';

export default mergeConfig(baseVitestConfig(), {
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/renderer/test-setup.ts'],
  },
});
