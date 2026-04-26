import { motion, radius, spacing, typography, zIndex } from '@firebase-desk/design-tokens';
import type { Config } from 'tailwindcss';

function tokenScale<T extends Record<string, unknown>>(
  prefix: string,
  scale: T,
): Record<keyof T, string> {
  return Object.fromEntries(
    Object.keys(scale).map((key) => [
      key,
      `var(--${prefix}-${
        key.replaceAll('.', '-').replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)
      })`,
    ]),
  ) as Record<keyof T, string>;
}

const config = {
  content: [
    './src/renderer/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/product-ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          app: 'var(--color-bg-app)',
          panel: 'var(--color-bg-panel)',
          subtle: 'var(--color-bg-panel-subtle)',
          elevated: 'var(--color-bg-elevated)',
          overlay: 'var(--color-bg-overlay)',
          inverse: 'var(--color-bg-inverse)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          disabled: 'var(--color-text-disabled)',
          inverse: 'var(--color-text-inverse)',
          brand: 'var(--color-text-brand)',
          danger: 'var(--color-text-danger)',
          warning: 'var(--color-text-warning)',
          success: 'var(--color-text-success)',
        },
        border: {
          subtle: 'var(--color-border-subtle)',
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
          danger: 'var(--color-border-danger)',
          warning: 'var(--color-border-warning)',
        },
        action: {
          primary: 'var(--color-action-primary)',
          'primary-hover': 'var(--color-action-primary-hover)',
          'primary-active': 'var(--color-action-primary-active)',
          secondary: 'var(--color-action-secondary)',
          'secondary-hover': 'var(--color-action-secondary-hover)',
          'ghost-hover': 'var(--color-action-ghost-hover)',
          selected: 'var(--color-action-selected)',
          'selected-hover': 'var(--color-action-selected-hover)',
        },
        status: {
          'production-bg': 'var(--color-status-production-bg)',
          'production-text': 'var(--color-status-production-text)',
          'production-border': 'var(--color-status-production-border)',
          'emulator-bg': 'var(--color-status-emulator-bg)',
          'emulator-text': 'var(--color-status-emulator-text)',
          'emulator-border': 'var(--color-status-emulator-border)',
          'success-bg': 'var(--color-status-success-bg)',
          'success-text': 'var(--color-status-success-text)',
          'success-border': 'var(--color-status-success-border)',
          'warning-bg': 'var(--color-status-warning-bg)',
          'warning-text': 'var(--color-status-warning-text)',
          'warning-border': 'var(--color-status-warning-border)',
          'danger-bg': 'var(--color-status-danger-bg)',
          'danger-text': 'var(--color-status-danger-text)',
          'danger-border': 'var(--color-status-danger-border)',
        },
      },
      spacing: tokenScale('space', spacing),
      borderRadius: tokenScale('radius', radius),
      boxShadow: tokenScale('shadow', { none: '', sm: '', md: '', popover: '', modal: '' }),
      fontFamily: {
        sans: 'var(--font-family-sans)',
        mono: 'var(--font-family-mono)',
      },
      fontSize: tokenScale('font-size', typography.size),
      fontWeight: tokenScale('font-weight', typography.weight),
      transitionDuration: tokenScale('motion-duration', motion.duration),
      transitionTimingFunction: tokenScale('motion-easing', motion.easing),
      zIndex: tokenScale('z', zIndex),
    },
  },
} satisfies Config;

export default config;
