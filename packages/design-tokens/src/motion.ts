export const motion = {
  duration: {
    instant: '0ms',
    fast: '80ms',
    base: '140ms',
    slow: '220ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;
