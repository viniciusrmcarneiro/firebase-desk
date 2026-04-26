import type { Config } from 'tailwindcss';
import desktopConfig from '../desktop/tailwind.config.ts';

const config = {
  ...desktopConfig,
  content: [
    './.storybook/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/product-ui/src/**/*.{ts,tsx}',
  ],
} satisfies Config;

export default config;
