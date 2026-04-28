import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal(viteConfig) {
    return {
      ...viteConfig,
      build: {
        ...viteConfig.build,
        // Storybook bundles docs/runtime/vendor code; this is not shipped app code.
        chunkSizeWarningLimit: 1_200,
      },
    };
  },
};

export default config;
