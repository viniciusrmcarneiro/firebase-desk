export const focusRing = {
  width: '2px',
  offset: '2px',
  color: 'var(--color-border-focus)',
  shadow:
    '0 0 0 var(--focus-ring-offset) var(--color-bg-app), 0 0 0 calc(var(--focus-ring-offset) + var(--focus-ring-width)) var(--focus-ring-color)',
} as const;
