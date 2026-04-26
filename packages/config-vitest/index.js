import { defineConfig, mergeConfig } from 'vitest/config';

/**
 * Shared vitest preset. Each package extends with `mergeConfig(baseVitestConfig(), ...)`.
 */
export function baseVitestConfig() {
  return defineConfig({
    test: {
      globals: false,
      environment: 'node',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      passWithNoTests: true,
      reporters: ['default'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov'],
      },
    },
  });
}

export { defineConfig, mergeConfig };
