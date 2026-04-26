import type { Preview } from '@storybook/react';
import '../src/styles.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: ['light', 'dark'],
      },
    },
    density: {
      description: 'Density',
      defaultValue: 'compact',
      toolbar: {
        icon: 'component',
        items: ['compact', 'comfortable'],
      },
    },
  },
  parameters: {
    backgrounds: {
      default: 'App',
      values: [
        { name: 'App', value: 'var(--color-bg-app)' },
        { name: 'Panel', value: 'var(--color-bg-panel)' },
      ],
    },
  },
  decorators: [
    (Story, context) => {
      document.documentElement.dataset.theme = String(context.globals.theme ?? 'light');
      document.documentElement.dataset.density = String(context.globals.density ?? 'compact');
      return (
        <div className='min-h-screen bg-bg-app p-4 text-text-primary'>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
